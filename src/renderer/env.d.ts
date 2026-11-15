import type { Api } from '../shared/api.ts';

declare global {
  interface Window {
    api: Api;
    // Chromium's EyeDropper (a colour from anywhere on the screen); not in the TypeScript DOM library yet.
    EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
  }
}
