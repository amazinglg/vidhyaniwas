import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { hardRefreshApp } from '@/utils/hardRefresh';
import { toast } from 'sonner';

const STORAGE_KEY = 'app-last-applied-release';
const PROMPT_SHOWN_KEY = 'app-release-prompt-shown';

const promptUserToRefresh = (releasedAt: string) => {
  // Avoid spamming the same toast multiple times for the same release
  if (sessionStorage.getItem(PROMPT_SHOWN_KEY) === releasedAt) return;
  sessionStorage.setItem(PROMPT_SHOWN_KEY, releasedAt);

  toast('A new version of the app is available', {
    description: 'Refresh to get the latest updates. Save your drafts first.',
    duration: Infinity,
    action: {
      label: 'Refresh now',
      onClick: () => {
        localStorage.setItem(STORAGE_KEY, releasedAt);
        void hardRefreshApp();
      },
    },
  });
};

const checkForNewRelease = async (isInitialLoad: boolean) => {
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
    if (isInitialLoad) {
      // First load of the session — safe to apply immediately, no drafts yet
      localStorage.setItem(STORAGE_KEY, data.released_at);
      await hardRefreshApp();
    } else {
      // User is mid-session (possibly with drafts) — prompt instead of force-reload
      promptUserToRefresh(data.released_at);
    }
  }
};

export const useForcedReleaseSync = () => {
  const initialDoneRef = useRef(false);

  useEffect(() => {
    void checkForNewRelease(true).then(() => {
      initialDoneRef.current = true;
    });

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
            // Never auto-reload mid-session — always prompt
            promptUserToRefresh(releasedAt);
          }
        },
      )
      .subscribe();

    const onFocus = () => {
      if (!initialDoneRef.current) return;
      void checkForNewRelease(false);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);
};
