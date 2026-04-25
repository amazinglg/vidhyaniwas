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
    data = { title: 'Vidhya Niwas', body: event.data?.text() || 'You have a new update' };
  }

  const title = data.title || 'Vidhya Niwas';
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
  const targetUrl = (event.notification.data && (event.notification.data as { url?: string }).url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          (client as WindowClient).navigate(targetUrl).catch(() => {});
          return (client as WindowClient).focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
