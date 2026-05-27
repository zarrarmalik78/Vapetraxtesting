import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'icon.png'],
        manifest: {
          name: 'VapeTrax POS',
          short_name: 'VapeTrax',
          description: 'Premium Vape Shop Management System',
          theme_color: '#8b5cf6',
          background_color: '#f3f4f9',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'icon.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Firebase Auth and Firestore should NOT be cached by workbox in a way that breaks them.
            // VitePWA defaults to letting them pass through, but we can be explicit.
            {
              urlPattern: /firestore\.googleapis\.com/,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /identitytoolkit\.googleapis\.com/,
              handler: 'NetworkOnly',
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
