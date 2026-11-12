/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Veröffentlichungskanal der App.
 * - `production`: Hauptversion unter `/wandelbar/` (Branch `main`)
 * - `preview`: Vorschau des laufenden Meilenstein-Branches unter `/wandelbar/preview/`
 *
 * Gesteuert über die Umgebungsvariable `WANDELBAR_CHANNEL` oder lokal über `--mode preview`.
 */
type AppChannel = 'production' | 'preview';

const BASE_BY_CHANNEL: Record<AppChannel, string> = {
  production: '/wandelbar/',
  preview: '/wandelbar/preview/',
};

function resolveChannel(mode: string): AppChannel {
  const fromEnv = process.env.WANDELBAR_CHANNEL;
  if (fromEnv === 'production' || fromEnv === 'preview') return fromEnv;
  if (fromEnv) throw new Error(`Unbekannter WANDELBAR_CHANNEL: "${fromEnv}"`);
  return mode === 'preview' ? 'preview' : 'production';
}

/**
 * Lockert die Content-Security-Policy aus `index.html` nur im Dev-Server.
 * Vite und das React-Plugin brauchen dort ein Inline-Skript (Fast Refresh) und
 * Inline-Styles (CSS-Hot-Reload). Fremde Adressen bleiben auch im Dev-Server gesperrt.
 * Der Produktions-Build enthält die CSP unverändert wie im Plan.
 */
function devContentSecurityPolicy(): Plugin {
  const cspMeta = /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)(")/;
  return {
    name: 'wandelbar:dev-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      if (!cspMeta.test(html)) {
        throw new Error('index.html enthält keine Content-Security-Policy.');
      }
      return html.replace(
        cspMeta,
        (_match, start: string, policy: string, end: string) =>
          `${start}${policy.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")}; style-src 'self' 'unsafe-inline'${end}`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const channel = resolveChannel(mode);
  const base = BASE_BY_CHANNEL[channel];
  const appName = channel === 'preview' ? 'Wandelbar Vorschau' : 'Wandelbar';

  return {
    base,
    define: {
      __APP_CHANNEL__: JSON.stringify(channel),
    },
    build: {
      // Lizenztexte aller eingebündelten Abhängigkeiten mit veröffentlichen (MIT verlangt den Hinweis).
      license: { fileName: 'third-party-licenses.md' },
      // Schriften nie als data:-URL einbetten: Die CSP erlaubt für Schriften nur 'self'.
      assetsInlineLimit: (filePath) => (/\.(woff2?|ttf|otf)$/i.test(filePath) ? false : undefined),
    },
    plugins: [
      react(),
      devContentSecurityPolicy(),
      VitePWA({
        registerType: 'autoUpdate',
        // Registrierung über `virtual:pwa-register` in src/app/pwa.ts (kein Inline-Skript wegen CSP).
        injectRegister: false,
        // Die Icons erfasst schon `globPatterns`; so steht nichts doppelt im Vorab-Cache.
        includeManifestIcons: false,
        manifest: {
          id: base,
          name: appName,
          short_name: appName,
          description:
            'Aus einem Grundriss ein begehbares 3D-Modell der eigenen Wohnung – offline und ohne Datenweitergabe.',
          lang: 'de',
          dir: 'ltr',
          start_url: base,
          scope: base,
          display: 'standalone',
          background_color: '#f4efe6',
          theme_color: '#24312f',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
          cleanupOutdatedCaches: true,
          // Gehört zu `autoUpdate`; das Plugin setzt es bei `injectRegister: false` nicht selbst.
          // Ohne `clientsClaim` steuert der Service Worker die Seite erst nach dem nächsten Laden.
          skipWaiting: true,
          clientsClaim: true,
          // Der Service Worker der Hauptversion darf die Vorschau nie ausliefern.
          navigateFallbackDenylist: channel === 'production' ? [/^\/wandelbar\/preview\//] : [],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'node',
    },
  };
});
