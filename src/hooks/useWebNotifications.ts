import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getStoredPushPreference, subscribeToWebPush } from '@/lib/webPush';

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
    if (!session || !user?.id || hasRequested.current) return;
    hasRequested.current = true;
    const timer = setTimeout(async () => {
      if (!('Notification' in window)) return;
      const preference = getStoredPushPreference(user.id);
      if (Notification.permission === 'granted' && preference !== 'disabled') {
        void subscribeToWebPush(user.id);
        return;
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [session, user?.id]);

  useEffect(() => {
    if (!session || !user) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      // Look up the current user's role + resident_id BEFORE subscribing,
      // otherwise the first events may fire while these are still null.
      const [{ data: roleRow }, { data: profile }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('resident_id').eq('user_id', user.id).maybeSingle(),
      ]);
      if (cancelled) return;

      const adminRoles = ['master_admin', 'president', 'vice_president', 'treasury_head', 'secretary'];
      const role = roleRow?.role as string | undefined;
      const isAdminUser = role ? adminRoles.includes(role) : false;
      const isSupervisorUser = role === 'supervisor';
      const myResidentId: string | null = profile?.resident_id || null;

      const notify = (title: string, body: string) => {
        toast.info(title, { description: body });
        void showBrowserNotification(title, body);
      };

      const statusLabel: Record<string, string> = {
        open: 'reopened',
        in_progress: 'marked in progress',
        pending_user_reply: 'pending resident reply',
        resolved: 'resolved',
        withdrawn: 'withdrawn',
      };

      channel = supabase
        .channel('society-realtime-notifications')
        // 1. New notices
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notices' }, (payload) => {
          const n = payload.new as { title: string; content: string; created_by: string | null };
          if (n.created_by === user.id) return;
          notify(`Notice: ${n.title}`, n.content?.substring(0, 150) || 'A new notice has been published.');
        })
        // 2. New maintenance entry — notify the resident it belongs to
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'maintenance_collections' }, (payload) => {
          const m = payload.new as { resident_id: string; month: string; year: number; total_maintenance: number };
          if (myResidentId && m.resident_id === myResidentId) {
            notify('Maintenance entry added', `${m.month} ${m.year} • ₹${m.total_maintenance}`);
          }
        })
        // 3. New pending signup — notify admins
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
          const p = payload.new as { is_approved: boolean; full_name: string; mobile: string };
          if (isAdminUser && !p.is_approved) {
            notify('New signup pending', `${p.full_name || p.mobile} is awaiting approval.`);
          }
        })
        // 4. New complaint — notify admins AND supervisors
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'complaints' }, (payload) => {
          const c = payload.new as { title: string; created_by: string | null };
          if (c.created_by === user.id) return;
          if (isAdminUser || isSupervisorUser) {
            notify('New complaint raised', c.title);
          }
        })
        // 5. Any complaint status change — notify the resident who raised it
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'complaints' }, (payload) => {
          const before = payload.old as { status: string };
          const after = payload.new as { status: string; resident_id: string; title: string };
          if (before.status !== after.status && myResidentId === after.resident_id) {
            const label = statusLabel[after.status] || `set to ${after.status}`;
            notify(`Complaint ${label}`, after.title);
          }
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [session, user?.id]);
};
