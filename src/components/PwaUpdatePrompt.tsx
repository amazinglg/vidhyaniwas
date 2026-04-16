import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const UPDATE_CHECK_INTERVAL = 60 * 1000; // Check every 60 seconds

const PwaUpdatePrompt = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForWaiting = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      // If there's already a waiting worker
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
      }

      // Listen for new updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
          }
        });
      });

      // Force an immediate update check
      registration.update();
    };

    checkForWaiting();

    // Auto-reload when the new SW takes over
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Check for updates frequently (every 60s)
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then(reg => reg?.update());
    }, UPDATE_CHECK_INTERVAL);

    // Also check on page focus (user switches back to app)
    const onFocus = () => {
      navigator.serviceWorker.getRegistration().then(reg => reg?.update());
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocus();
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const handleUpdate = () => {
    if (!waitingWorker) return;
    setUpdating(true);
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    // controllerchange listener will trigger reload
  };

  if (!waitingWorker) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-top-4 duration-500">
      <div className="bg-accent text-accent-foreground rounded-xl shadow-2xl p-4 flex items-center gap-3">
        <div className="flex-shrink-0 bg-primary/20 rounded-lg p-2.5">
          <RefreshCw className={`h-5 w-5 ${updating ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">
            {lang === 'hi' ? 'नया अपडेट उपलब्ध!' : 'Update Available!'}
          </p>
          <p className="text-xs opacity-80 mt-0.5">
            {lang === 'hi'
              ? 'नया वर्शन तैयार है, अपडेट करें'
              : 'A new version is ready. Tap to update.'}
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleUpdate}
          disabled={updating}
          className="flex-shrink-0 gap-1 text-xs font-bold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${updating ? 'animate-spin' : ''}`} />
          {updating
            ? (lang === 'hi' ? 'अपडेट हो रहा...' : 'Updating...')
            : (lang === 'hi' ? 'अपडेट' : 'Update')}
        </Button>
      </div>
    </div>
  );
};

export default PwaUpdatePrompt;
