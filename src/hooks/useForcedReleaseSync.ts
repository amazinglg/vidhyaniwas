import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { hardRefreshApp } from '@/utils/hardRefresh';

const STORAGE_KEY = 'app-last-applied-release';

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
    localStorage.setItem(STORAGE_KEY, data.released_at);
    return;
  }
  if (last !== data.released_at) {
    localStorage.setItem(STORAGE_KEY, data.released_at);
    await hardRefreshApp();
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
            void hardRefreshApp();
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
