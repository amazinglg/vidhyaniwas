// Hard refresh utility — wipes everything and reloads to the latest deployed version.
// Used by the user-facing "Hard Refresh" button and the admin "Release Updates" flow.

const PRESERVE_LOCAL_STORAGE_KEYS = [
  'app-last-applied-release',
  'pwa-last-seen-sw-etag',
  'lang',
  'push-notification-preference-v1',
  'notif_welcome_modal_shown_v1',
];

export const hardRefreshApp = async (): Promise<void> => {
  // 1. Unregister ALL service workers (forces a clean reinstall on next load)
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
  } catch {}

  // 2. Delete every Cache Storage entry
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

  // 4. Clear localStorage but preserve auth tokens + release pointer + language
  try {
    const preserved: Record<string, string> = {};
    for (const key of PRESERVE_LOCAL_STORAGE_KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null) preserved[key] = val;
    }
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

  // 5. Expire all cookies for this origin
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const eqIdx = cookie.indexOf('=');
      const name = (eqIdx > -1 ? cookie.slice(0, eqIdx) : cookie).trim();
      if (!name) continue;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
    }
  } catch {}

  // 6. Cache-busting hard reload — always land on /my-profile so users never see a blank page
  const url = '/my-profile?v=' + Date.now();
  window.location.replace(url);
};
