import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ragscholar.app',
  appName: 'RAG Scholar',
  webDir: 'build',
  server: {
    url: 'https://symptomatic-underscrupulously-verlie.ngrok-free.dev',
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