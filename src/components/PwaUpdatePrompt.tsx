import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SW_ETAG_STORAGE_KEY = 'pwa-last-seen-sw-etag';
const UPDATE_CHECK_INTERVAL_MS = 15000;

// Keys we MUST preserve across a forced update (auth + release pointer)
const PRESERVE_LOCAL_STORAGE_KEYS = [
  'app-last-applied-release',
  SW_ETAG_STORAGE_KEY,
];

const nukeEverything = async () => {
  // 1. Unregister all service workers
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
  } catch {}

  // 2. Delete all Cache Storage entries
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch {}

  // 3. Clear sessionStorage entirely
  try {
    sessionStorage.clear();
  } catch {}

  // 4. Clear localStorage but preserve auth + release pointer
  try {
    const preserved: Record<string, string> = {};
    for (const key of PRESERVE_LOCAL_STORAGE_KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null) preserved[key] = val;
    }
    // Preserve all Supabase auth tokens (keys starting with sb-)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        const val = localStorage.getItem(key);
        if (val !== null) preserved[key] = val;
      }
    }
    localStorage.clear();
    for (const [k, v] of Object.entries(preserved)) {
      localStorage.setItem(k, v);
    }
  } catch {}

  // 5. Clear non-essential cookies for this origin
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const eqIdx = cookie.indexOf('=');
      const name = (eqIdx > -1 ? cookie.slice(0, eqIdx) : cookie).trim();
      if (!name) continue;
      // Expire on current path and root
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
    }
  } catch {}
};

const PwaUpdatePrompt = () => {
  const [updateReady, setUpdateReady] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const lastSeenEtagRef = useRef<string | null>(null);
  const isApplyingRef = useRef(false);

  const persistEtag = useCallback((etag: string | null) => {
    if (!etag) return;
    lastSeenEtagRef.current = etag;
    localStorage.setItem(SW_ETAG_STORAGE_KEY, etag);
  }, []);

  const hardReload = useCallback(async () => {
    await nukeEverything();
    // Cache-busting reload — bypasses HTTP cache for index.html
    const url = window.location.pathname + '?v=' + Date.now();
    window.location.replace(url);
  }, []);

  const applyUpdate = useCallback(async () => {
    if (isApplyingRef.current) return;
    isApplyingRef.current = true;
    setIsApplyingUpdate(true);
    setIsDismissed(false);

    // Let UI paint loading state
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const registration =
        registrationRef.current ?? (await navigator.serviceWorker?.getRegistration());

      if (registration) {
        registrationRef.current = registration;

        // Try to fetch any pending update
        await registration.update().catch(() => {});

        // Tell waiting/installing worker to take over (best-effort)
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        const installing = registration.installing;
        if (installing) {
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      }
    } catch {}

    // Always hard-reload after a short delay so the user sees progress and
    // we guarantee fresh assets regardless of SW state.
    window.setTimeout(() => {
      void hardReload();
    }, 800);
  }, [hardReload]);

  const inspectRegistration = useCallback(async (forceApply = false) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    registrationRef.current = registration;

    if (registration.waiting) {
      setUpdateReady(true);
      if (forceApply) {
        void applyUpdate();
      }
      return;
    }

    await registration.update().catch(() => {});
  }, [applyUpdate]);

  const detectPublishedUpdate = useCallback(async (forceApply = false) => {
    try {
      const response = await fetch(`/sw.js?ts=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'cache-control': 'no-cache',
        },
      });

      const nextEtag = response.headers.get('etag');
      const previousEtag = lastSeenEtagRef.current ?? localStorage.getItem(SW_ETAG_STORAGE_KEY);

      if (!previousEtag && nextEtag) {
        persistEtag(nextEtag);
        await inspectRegistration(false);
        return;
      }

      if (nextEtag && previousEtag && nextEtag !== previousEtag) {
        persistEtag(nextEtag);
        setUpdateReady(true);
        setIsDismissed(false);
        await inspectRegistration(forceApply);
        return;
      }

      if (nextEtag) {
        persistEtag(nextEtag);
      }

      await inspectRegistration(false);
    } catch {
      await inspectRegistration(false);
    }
  }, [inspectRegistration, persistEtag]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return;
      void detectPublishedUpdate(true);
    };

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;

      registrationRef.current = registration;

      if (registration.waiting) {
        setUpdateReady(true);
      }

      registration.addEventListener('updatefound', () => {
        const nextWorker = registration.installing;
        if (!nextWorker) return;

        nextWorker.addEventListener('statechange', () => {
          if (nextWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true);
            void applyUpdate();
          }

          if (nextWorker.state === 'activated') {
            setIsApplyingUpdate(false);
          }
        });
      });
    });

    void detectPublishedUpdate(false);

    const intervalId = window.setInterval(() => {
      void detectPublishedUpdate(true);
    }, UPDATE_CHECK_INTERVAL_MS);

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    };
  }, [applyUpdate, detectPublishedUpdate]);

  useEffect(() => {
    if (!updateReady || isApplyingUpdate) return;

    const timeoutId = window.setTimeout(() => {
      void applyUpdate();
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [applyUpdate, isApplyingUpdate, updateReady]);

  if ((!updateReady && !isApplyingUpdate) || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
            <RefreshCw className={`h-4 w-4 ${isApplyingUpdate ? 'animate-spin' : ''}`} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {isApplyingUpdate ? 'Updating app…' : 'New app update found'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isApplyingUpdate
                ? 'Clearing caches, cookies and storage. The app will reload to the latest version in a moment.'
                : 'The latest published version is ready. Tap update to load it immediately.'}
            </p>

            {isApplyingUpdate && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
              </div>
            )}

            {!isApplyingUpdate && (
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={() => void applyUpdate()}>
                  Update now
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsDismissed(true)}>
                  Later
                </Button>
              </div>
            )}
          </div>

          {!isApplyingUpdate && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss update notice"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PwaUpdatePrompt;
