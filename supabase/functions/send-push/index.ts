// Sends a Web Push notification to one or more users via VAPID.
// Uses @negrel/webpush — a pure-Deno Web Push implementation built on the
// native Web Crypto API. The previous npm `web-push` library required
// Node's `crypto.ECDH` which isn't implemented in Supabase's Deno edge
// runtime, causing every delivery to fail.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as webpush from 'jsr:@negrel/webpush@0.5.0';
import { decodeBase64Url } from 'jsr:@std/encoding@0.224.0/base64url';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

type Audience =
  | { kind: 'all' }
  | { kind: 'admins' }
  | { kind: 'users'; userIds: string[] }
  | { kind: 'residents'; residentIds: string[] };

interface PushBody {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  audience: Audience;
  excludeUserId?: string;
}

// Build the VAPID application server once at boot.
let appServerPromise: Promise<webpush.ApplicationServer> | null = null;
async function getAppServer(): Promise<webpush.ApplicationServer> {
  if (!appServerPromise) {
    appServerPromise = (async () => {
      // Convert raw VAPID base64url keys (the format we already store as
      // env vars) into a JWK CryptoKeyPair the library expects.
      const publicRaw = decodeBase64Url(VAPID_PUBLIC_KEY);
      const privateRaw = decodeBase64Url(VAPID_PRIVATE_KEY);

      const toBase64Url = (bytes: Uint8Array) =>
        btoa(String.fromCharCode(...bytes))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

      // Public key: 65-byte uncompressed point (0x04 || X || Y)
      const x = toBase64Url(publicRaw.subarray(1, 33));
      const y = toBase64Url(publicRaw.subarray(33, 65));
      const d = toBase64Url(privateRaw);

      const publicKey = await crypto.subtle.importKey(
        'jwk',
        { kty: 'EC', crv: 'P-256', x, y, ext: true },
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
      );
      const privateKey = await crypto.subtle.importKey(
        'jwk',
        { kty: 'EC', crv: 'P-256', x, y, d, ext: true },
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign']
      );

      return await webpush.ApplicationServer.new({
        contactInformation: VAPID_SUBJECT,
        vapidKeys: { publicKey, privateKey },
      });
    })();
  }
  return appServerPromise;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as PushBody;
    if (!body?.title || !body?.body || !body?.audience) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    let targetUserIds: string[] = [];
    if (body.audience.kind === 'users') {
      targetUserIds = body.audience.userIds.filter(Boolean);
    } else if (body.audience.kind === 'residents') {
      const ids = body.audience.residentIds.filter(Boolean);
      if (ids.length) {
        const { data } = await admin.from('profiles').select('user_id').in('resident_id', ids);
        targetUserIds = (data || []).map((r) => r.user_id);
      }
    } else if (body.audience.kind === 'admins') {
      const { data } = await admin
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['master_admin', 'president', 'vice_president', 'treasury_head', 'secretary', 'supervisor']);
      targetUserIds = (data || []).map((r) => r.user_id);
    } else {
      const { data } = await admin.from('profiles').select('user_id').eq('is_approved', true);
      targetUserIds = (data || []).map((r) => r.user_id);
    }

    if (body.excludeUserId) {
      targetUserIds = targetUserIds.filter((id) => id !== body.excludeUserId);
    }
    targetUserIds = Array.from(new Set(targetUserIds));

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no targets' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: subs, error: subErr } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', targetUserIds);

    if (subErr) {
      return new Response(JSON.stringify({ error: subErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({
      title: body.title,
      body: body.body,
      url: body.url || '/',
      tag: body.tag,
    });
    const payloadBytes = new TextEncoder().encode(payload);

    const appServer = await getAppServer();

    let sent = 0;
    let removed = 0;
    const staleIds: string[] = [];

    await Promise.all(
      (subs || []).map(async (s) => {
        try {
          const subscriber = appServer.subscribe({
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          });
          await subscriber.pushTextMessage(payloadBytes, { ttl: 60 * 60 * 24 });
          sent++;
        } catch (err: unknown) {
          const status =
            (err as { statusCode?: number; status?: number })?.statusCode ??
            (err as { statusCode?: number; status?: number })?.status;
          if (status === 404 || status === 410) {
            staleIds.push(s.id);
            removed++;
          } else {
            console.error('[send-push] delivery error:', err);
          }
        }
      })
    );

    if (staleIds.length) {
      await admin.from('push_subscriptions').delete().in('id', staleIds);
    }

    return new Response(JSON.stringify({ sent, removed, targets: targetUserIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-push] fatal:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
