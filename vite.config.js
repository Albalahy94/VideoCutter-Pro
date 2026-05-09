import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
    ],
    server: {
        // headers: {
        //     'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        //     'Cross-Origin-Embedder-Policy': 'credentialless',
        //     'Cross-Origin-Resource-Policy': 'cross-origin',
        // },
    },
    optimizeDeps: {
        exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    worker: {
        format: 'es',
    },
});
