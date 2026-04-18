import { useEffect } from 'react';

// PWA updates are auto-applied via vite-plugin-pwa autoUpdate (registered in main.tsx).
// This component is a safety net: if a waiting SW is ever detected, force activation + reload.
const PwaUpdatePrompt = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const activateWaiting = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    };

    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return;
      activateWaiting(reg);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            activateWaiting(reg);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
};

export default PwaUpdatePrompt;

