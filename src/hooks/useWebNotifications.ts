import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
};

// Soft chime via WebAudio (no asset needed) – plays a short pleasant 2-tone sound
const playNotificationSound = () => {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const tones = [880, 1320];
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.3);
    });
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {}
};

const showBrowserNotification = async (title: string, body: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  // Vibrate on mobile (Android)
  try { (navigator as any).vibrate?.([180, 80, 180]); } catch {}
  playNotificationSound();

  // Prefer ServiceWorker.showNotification on mobile (Notification constructor often unsupported in Android Chrome PWAs)
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'society-notice',
        requireInteraction: false,
        silent: false,
      } as any);
      return;
    }
  } catch {}

  try {
    const n = new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      tag: 'society-notice',
    } as NotificationOptions);
    n.onclick = () => { window.focus(); n.close(); };
  } catch {}
};

export const useWebNotifications = () => {
  const { session, user } = useAuth();
  const hasRequested = useRef(false);

  useEffect(() => {
    if (!session || hasRequested.current) return;
    hasRequested.current = true;
    const timer = setTimeout(() => { requestNotificationPermission(); }, 2000);
    return () => clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('notices-realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notices' },
        (payload) => {
          const notice = payload.new as { title: string; content: string; created_by: string | null };
          if (notice.created_by === user?.id) return;

          toast.info(`📢 ${notice.title}`, { description: notice.content?.substring(0, 100) });
          void showBrowserNotification(
            `📢 ${notice.title}`,
            notice.content?.substring(0, 150) || 'A new notice has been published.'
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, user?.id]);
};
