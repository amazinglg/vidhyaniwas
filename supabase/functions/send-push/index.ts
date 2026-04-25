// Sends a Web Push notification to one or more users via VAPID.
// Invoked by the client whenever a notice/maintenance/complaint event happens
// that should reach users even when their app is closed.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

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
  // Optional: id of the actor who triggered this — they will NOT receive the push (avoid self-notify).
  excludeUserId?: string;
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

    // Validate caller
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

    // Use service role to read subscriptions across users + resolve audience
    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve target user_ids
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
        .in('role', ['master_admin', 'president', 'vice_president', 'treasury_head', 'secretary']);
      targetUserIds = (data || []).map((r) => r.user_id);
    } else {
      // 'all' — every approved profile
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

    let sent = 0;
    let removed = 0;
    const staleIds: string[] = [];

    await Promise.all(
      (subs || []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 60 * 60 * 24 } // 24h
          );
          sent++;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          // 404/410 = subscription gone; clean it up
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
