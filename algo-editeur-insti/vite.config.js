import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest: false,
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: [
        'icons/favicon.ico',
        'icons/apple-touch-icon.png',
        'icons/insti-logo.png',
        'icons/diic-logo.png',
      ],
      workbox: {
        // Assets précachés (tout ce qui est bundlé)
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,woff,woff2}'],
        // Pas de CDN, pas d'API distante : tout est local
        runtimeCaching: [],
        // Nettoyage des anciens caches à chaque nouvelle version
        cleanupOutdatedCaches: true,
        // Fallback pour la navigation (SPA)
        navigateFallback: 'index.html',
        // On exclut les gros fichiers de dev / test
        globIgnores: ['**/node_modules/**/*'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: { port: 5173, open: true },
  build: { target: 'es2020', outDir: 'dist' },
});