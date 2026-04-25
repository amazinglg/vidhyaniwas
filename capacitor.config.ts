import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.07a74aa3464f4814b6ef267aeb8af61e',
  appName: 'Vidhya Niwas',
  webDir: 'dist',
  // Hot-reload from the Lovable sandbox during development.
  // For a PRODUCTION APK release, comment out the entire `server` block below
  // so the app loads bundled assets from `webDir` instead.
  server: {
    url: 'https://07a74aa3-464f-4814-b6ef-267aeb8af61e.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#1e3a5f',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e3a5f',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
