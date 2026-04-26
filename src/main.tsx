import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNativeRuntime } from "./lib/nativeRuntime";

// Native (Capacitor) runtime — no-op on web.
void initNativeRuntime();

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
  // Production: register SW. Updates are surfaced via the in-app toast in
  // useForcedReleaseSync — we no longer auto-reload on focus, so drafts stay safe.
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: true,
      // Do NOT auto-apply updates here. The release-sync hook prompts the user.
      onNeedRefresh() {},
      onOfflineReady() {},
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
