import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA: Guard against service worker in iframes/preview
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
} else {
  // Production: register SW with aggressive auto-update
  import("virtual:pwa-register").then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // New version installed in background — apply immediately
        updateSW(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        // Check for updates every 30 seconds
        setInterval(() => {
          registration.update().catch(() => {});
        }, 30 * 1000);
        // Check on focus / visibility change
        const checkUpdate = () => registration.update().catch(() => {});
        window.addEventListener("focus", checkUpdate);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkUpdate();
        });
      },
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
