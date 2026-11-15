// The mobile app: Svelte in a Capacitor shell. The shared core comes from ../src/shared (one model for both apps).
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte()],
  base: './',
  build: { outDir: 'www', emptyOutDir: true },
  server: { fs: { allow: ['..'] } },
});
