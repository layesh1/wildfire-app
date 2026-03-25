import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.minutesmatter.app',
  appName: 'Minutes Matter',
  webDir: 'public',
  server: {
    url: 'https://wildfire-app-layesh1s-projects.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#3e2723',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#3e2723',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#3e2723',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      backgroundColor: '#3e2723',
      style: 'LIGHT',
    },
  },
};

export default config;
