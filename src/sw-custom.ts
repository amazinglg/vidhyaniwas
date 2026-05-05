/// <reference lib="webworker" />
// Custom service worker — extends the auto-generated Workbox SW with web-push support.
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Standard Workbox setup (mirrors what generateSW gave us)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();
clientsClaim();

// ---------- Web Push ----------
self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string; tag?: string; icon?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'Shri Vidhya Niwas', body: event.data?.text() || 'You have a new update' };
  }

  const cleanTitle = String(data.title || 'Shri Vidhya Niwas').replace(/&#\d+;|[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim();
  const title = cleanTitle || 'Shri Vidhya Niwas';
  const options: NotificationOptions = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'society-push',
    data: { url: data.url || '/' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const rawUrl = (event.notification.data && (event.notification.data as { url?: string }).url) || '/';
  // Build an absolute URL within our scope so navigate/openWindow always work.
  const targetUrl = new URL(rawUrl, self.registration.scope).href;

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Prefer an already-open client — focus it and route via postMessage so
    // React Router handles the navigation without a full reload (which loses
    // session state). Fall back to client.navigate, then openWindow.
    for (const client of allClients) {
      const win = client as WindowClient;
      try {
        win.postMessage({ type: 'NAVIGATE', url: rawUrl });
        await win.focus();
        return;
      } catch {}
    }
    for (const client of allClients) {
      try {
        const win = client as WindowClient;
        await win.navigate(targetUrl);
        await win.focus();
        return;
      } catch {}
    }
    await self.clients.openWindow(targetUrl);
  })());
});
