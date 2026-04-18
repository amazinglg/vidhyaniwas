import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'app-last-applied-release';

const wipeAndReload = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
  } catch {}
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch {}
  // Hard reload bypassing HTTP cache where possible
  window.location.replace(window.location.pathname + '?v=' + Date.now());
};

const checkAndApply = async () => {
  const { data, error } = await supabase
    .from('app_releases')
    .select('released_at')
    .order('released_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.released_at) return;
  const last = localStorage.getItem(STORAGE_KEY);
  if (!last) {
    // First time: just record current pointer, don't reload existing users on rollout
    localStorage.setItem(STORAGE_KEY, data.released_at);
    return;
  }
  if (last !== data.released_at) {
    localStorage.setItem(STORAGE_KEY, data.released_at);
    await wipeAndReload();
  }
};

export const useForcedReleaseSync = () => {
  useEffect(() => {
    void checkAndApply();

    const channel = supabase
      .channel('app-releases-broadcast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'app_releases' },
        (payload) => {
          const releasedAt = (payload.new as { released_at?: string })?.released_at;
          if (!releasedAt) return;
          const last = localStorage.getItem(STORAGE_KEY);
          if (last !== releasedAt) {
            localStorage.setItem(STORAGE_KEY, releasedAt);
            void wipeAndReload();
          }
        },
      )
      .subscribe();

    const onFocus = () => void checkAndApply();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);
};
