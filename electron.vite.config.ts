import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    root: 'src/renderer',
    plugins: [svelte()],
    build: { rollupOptions: { input: { index: resolve('src/renderer/index.html') } } },
  },
});
