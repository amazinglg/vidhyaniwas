import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { hardRefreshApp } from '@/utils/hardRefresh';

const SW_ETAG_STORAGE_KEY = 'pwa-last-seen-sw-etag';
const UPDATE_CHECK_INTERVAL_MS = 15000;

const PwaUpdatePrompt = () => {
  const { t } = useLanguage();
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

  const applyUpdate = useCallback(async () => {
    if (isApplyingRef.current) return;
    isApplyingRef.current = true;
    setIsApplyingUpdate(true);
    setIsDismissed(false);

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const registration =
        registrationRef.current ?? (await navigator.serviceWorker?.getRegistration());
      if (registration) {
        registrationRef.current = registration;
        await registration.update().catch(() => {});
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

    window.setTimeout(() => {
      void hardRefreshApp();
    }, 800);
  }, []);

  const inspectRegistration = useCallback(async (forceApply = false) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    registrationRef.current = registration;
    if (registration.waiting) {
      setUpdateReady(true);
      if (forceApply) void applyUpdate();
      return;
    }
    await registration.update().catch(() => {});
  }, [applyUpdate]);

  const detectPublishedUpdate = useCallback(async (forceApply = false) => {
    try {
      const response = await fetch(`/sw.js?ts=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' },
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
      if (nextEtag) persistEtag(nextEtag);
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
      if (registration.waiting) setUpdateReady(true);

      registration.addEventListener('updatefound', () => {
        const nextWorker = registration.installing;
        if (!nextWorker) return;
        nextWorker.addEventListener('statechange', () => {
          if (nextWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true);
            void applyUpdate();
          }
          if (nextWorker.state === 'activated') setIsApplyingUpdate(false);
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

  if ((!updateReady && !isApplyingUpdate) || isDismissed) return null;

  return (
    <div
      className="fixed left-3 right-3 z-50 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-4 duration-300"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
    >
      <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary shrink-0">
            <RefreshCw className={`h-4 w-4 ${isApplyingUpdate ? 'animate-spin' : ''}`} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {isApplyingUpdate ? t('app_updating') : t('app_update_available')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-snug">
              {isApplyingUpdate ? t('app_updating_msg') : t('app_update_ready_msg')}
            </p>

            {isApplyingUpdate && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
              </div>
            )}

            {!isApplyingUpdate && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => void applyUpdate()} className="h-9 px-4">
                  {t('update_now')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsDismissed(true)} className="h-9 px-4">
                  {t('later')}
                </Button>
              </div>
            )}
          </div>

          {!isApplyingUpdate && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shrink-0"
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
