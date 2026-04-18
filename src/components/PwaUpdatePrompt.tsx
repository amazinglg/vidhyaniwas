import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SW_ETAG_STORAGE_KEY = 'pwa-last-seen-sw-etag';
const UPDATE_CHECK_INTERVAL_MS = 15000;

const PwaUpdatePrompt = () => {
  const [updateReady, setUpdateReady] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const lastSeenEtagRef = useRef<string | null>(null);

  const persistEtag = useCallback((etag: string | null) => {
    if (!etag) return;
    lastSeenEtagRef.current = etag;
    localStorage.setItem(SW_ETAG_STORAGE_KEY, etag);
  }, []);

  const applyUpdate = useCallback(async () => {
    const registration = registrationRef.current;
    if (!registration) return;

    setIsApplyingUpdate(true);
    setIsDismissed(false);

    await registration.update().catch(() => {});

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    const installingWorker = registration.installing;
    if (!installingWorker) {
      setIsApplyingUpdate(false);
    }
  }, []);

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

    let refreshing = false;

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return;
      void detectPublishedUpdate(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

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
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
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
              {isApplyingUpdate ? 'Updating app now…' : 'New app update found'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isApplyingUpdate
                ? 'Please keep the app open for a moment while the latest changes are applied.'
                : 'The latest published version is ready. Tap update to load it immediately.'}
            </p>

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

