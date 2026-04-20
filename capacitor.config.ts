import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dental.app',
  appName: 'dental-system-cholna',
  webDir: 'out',
  server: {
    url: 'http://localhost:3000',
    cleartext: true,
  },
};

export default config;