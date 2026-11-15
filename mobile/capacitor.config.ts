import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.potionrack.app',
  appName: 'Potion Rack',
  webDir: 'www',
  plugins: {
    // Requests to the desktop go through the native HTTP client: plain http on the local network, no CORS.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
