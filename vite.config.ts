import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: path.resolve(__dirname, 'src/renderer'),
    build: {
        outDir: path.resolve(__dirname, 'dist/renderer'),
        emptyOutDir: true,
        rollupOptions: {
            input: path.resolve(__dirname, 'src/renderer/index.ts'),
            output: {
                format: 'es',
                entryFileNames: 'index.js',
            },
        },
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    server: {
        port: 5173,
    },
    optimizeDeps: {
        include: [
            'codemirror',
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/commands',
            '@codemirror/lang-markdown',
            '@codemirror/theme-one-dark',
            '@codemirror/autocomplete',
            '@codemirror/language',
            '@lezer/highlight',
            '@lezer/markdown',
        ],
    },
});