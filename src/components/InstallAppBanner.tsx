import { useState, useEffect } from 'react';
import { X, Download, Smartphone, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'install-banner-dismissed';

const InstallAppBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const { lang, t } = useLanguage();

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    const mq = window.matchMedia('(display-mode: standalone)');
    const mqHandler = (e: MediaQueryListEvent) => {
      if (e.matches) setIsStandalone(true);
    };
    mq.addEventListener('change', mqHandler);

    if (sessionStorage.getItem(DISMISS_KEY) === '1') setDismissed(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setIsStandalone(true);
      setDismissed(true);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      mq.removeEventListener('change', mqHandler);
    };
  }, []);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDismissed(true);
          sessionStorage.setItem(DISMISS_KEY, '1');
        }
      } finally {
        setInstalling(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      alert(t('install_ios_msg'));
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, '1');
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed right-4 z-50 h-14 w-14 rounded-full gradient-warm text-primary-foreground shadow-2xl flex items-center justify-center animate-in zoom-in-50 duration-300 hover:scale-110 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        aria-label={t('install_app')}
      >
        <Download className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className="fixed left-3 right-3 z-50 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-4 duration-500"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
    >
      <div className="relative rounded-2xl shadow-2xl p-4 pr-3 gradient-warm text-primary-foreground overflow-hidden">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary-foreground/10 blur-2xl" />

        <div className="relative flex items-start gap-3">
          <div className="flex-shrink-0 bg-primary-foreground/20 rounded-xl p-2.5 backdrop-blur-sm">
            <Smartphone className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">
              {lang === 'hi' ? 'ऐप इंस्टॉल करें!' : 'Install our App!'}
            </p>
            <p className="text-xs opacity-90 mt-0.5 leading-snug">
              {t('install_app_short')}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleInstall}
                disabled={installing}
                className="h-9 gap-1.5 text-xs font-bold"
              >
                <Download className="h-3.5 w-3.5" />
                {installing ? t('installing') : t('install')}
              </Button>
              <button
                onClick={() => setMinimized(true)}
                className="text-xs underline-offset-2 hover:underline opacity-90"
              >
                {lang === 'hi' ? 'छोटा करें' : 'Minimize'}
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="rounded-full p-1.5 hover:bg-primary-foreground/20 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallAppBanner;
