// Web Push subscription helper — runs only in the browser PWA, not on native Capacitor.
import { supabase } from '@/integrations/supabase/client';

// VAPID PUBLIC KEY (safe to expose; matches the private key stored as a server secret)
const VAPID_PUBLIC_KEY =
  'BBKPCtgnQ521h8tWeyMSYmfC4tOUNyCdNu4Kw47_xsj_eEMJaG_Fu8W9ihKVoG4fSVrwEPPvdS6ZNIrHdgaON2s';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return '';
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function subscribeToWebPush(userId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;

    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    const endpoint = json.endpoint || sub.endpoint;
    const p256dh = json.keys?.p256dh || arrayBufferToBase64(sub.getKey('p256dh'));
    const auth = json.keys?.auth || arrayBufferToBase64(sub.getKey('auth'));
    if (!endpoint || !p256dh || !auth) return false;

    // Upsert by endpoint (unique per device)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

    if (error) {
      console.warn('[push] failed to save subscription:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[push] subscription failed:', e);
    return false;
  }
}
