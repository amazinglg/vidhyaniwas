import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isInStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  window.matchMedia('(display-mode: minimal-ui)').matches ||
  (navigator as any).standalone === true;

export const useInstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(isInStandalone());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setStandalone(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const canInstall = !standalone && (!!deferred || isIOS);

  const promptInstall = async (onIosFallback?: () => void) => {
    if (deferred) {
      setInstalling(true);
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } finally {
        setInstalling(false);
        setDeferred(null);
      }
    } else if (isIOS && onIosFallback) {
      onIosFallback();
    }
  };

  return { canInstall, standalone, installing, isIOS, promptInstall };
};
