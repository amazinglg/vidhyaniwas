import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallAppBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // default true to avoid flash
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    // Detect if running as installed PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Listen for display-mode changes (e.g. user installs while on page)
    const mq = window.matchMedia('(display-mode: standalone)');
    const mqHandler = (e: MediaQueryListEvent) => {
      if (e.matches) setIsStandalone(true);
    };
    mq.addEventListener('change', mqHandler);

    if (sessionStorage.getItem('install-banner-dismissed') === '1') {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Hide banner if app gets installed
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

  // Don't show if already installed PWA, or dismissed, or no install prompt available on non-iOS
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isStandalone || dismissed) return null;
  // Only show if we have the native prompt OR on iOS (where we show manual instructions)
  if (!deferredPrompt && !isIOS) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDismissed(true);
          sessionStorage.setItem('install-banner-dismissed', '1');
        }
      } finally {
        setInstalling(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      const msg = lang === 'hi'
        ? 'Safari में नीचे Share बटन (⬆) दबाएं, फिर "Add to Home Screen" चुनें'
        : 'Tap the Share button (⬆) at the bottom in Safari, then tap "Add to Home Screen"';
      alert(msg);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('install-banner-dismissed', '1');
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-4 duration-500">
      <div className="relative bg-primary text-primary-foreground rounded-xl shadow-2xl p-4 flex items-center gap-3">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex-shrink-0 bg-primary-foreground/20 rounded-lg p-2.5 animate-pulse">
          <Smartphone className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <p className="font-semibold text-sm leading-tight">
            {lang === 'hi' ? 'ऐप इंस्टॉल करें!' : 'Install our App!'}
          </p>
          <p className="text-xs opacity-90 mt-0.5">
            {lang === 'hi'
              ? 'एक क्लिक में फ़ोन पर इंस्टॉल करें'
              : 'One tap install — use like a real app'}
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={handleInstall}
          disabled={installing}
          className="flex-shrink-0 gap-1 text-xs font-bold"
        >
          <Download className="h-3.5 w-3.5" />
          {installing
            ? (lang === 'hi' ? 'इंस्टॉल हो रहा...' : 'Installing...')
            : (lang === 'hi' ? 'इंस्टॉल' : 'Install')}
        </Button>
      </div>
    </div>
  );
};

export default InstallAppBanner;
