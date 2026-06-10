import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        tailwindcss(),
        react(),
    ],
    base: './',
    root: path.resolve(__dirname, 'src/renderer'),
    build: {
        outDir: path.resolve(__dirname, 'dist/renderer'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                figures: path.resolve(__dirname, 'src/renderer/figures.html'),
                paints: path.resolve(__dirname, 'src/renderer/paints.html'),
                settings: path.resolve(__dirname, 'src/renderer/settings.html'),
                palette: path.resolve(__dirname, 'src/renderer/palette.html'),
            },
            output: {
                format: 'es',
                entryFileNames: '[name].js',
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
            'react',
            'react-dom',
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