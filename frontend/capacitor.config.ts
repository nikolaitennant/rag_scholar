import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ragscholar.app',
  appName: 'RAG Scholar',
  webDir: 'build',
  server: {
    url: 'http://192.168.4.175:3000',
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