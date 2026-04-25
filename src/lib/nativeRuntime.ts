// Native runtime bootstrap — runs only when the app is launched as a Capacitor APK/IPA.
// On web (PWA / browser), this is a no-op.
import { Capacitor } from '@capacitor/core';

export async function initNativeRuntime() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
  } catch {}

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    await StatusBar.setBackgroundColor({ color: '#1e3a5f' }).catch(() => {});
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  } catch {}

  // Hardware back button on Android — let the browser/router handle it.
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else App.exitApp();
    });
  } catch {}
}

// Register native FCM push notifications. Call this AFTER the user is authenticated
// so we can persist their device token against their profile (handled separately).
export async function registerNativePush(onToken: (token: string) => void | Promise<void>) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      await onToken(token.value);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Native push registration error:', err);
    });
  } catch (e) {
    console.error('Native push setup failed:', e);
  }
}
