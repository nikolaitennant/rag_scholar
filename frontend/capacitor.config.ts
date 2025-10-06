import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ragscholar.app',
  appName: 'RAG Scholar',
  webDir: 'build',
  server: {
    url: 'https://ragscholar.ngrok.app',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: 'transparent',
      overlaysWebView: true
    }
  }
};

export default config;