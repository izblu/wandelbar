/// <reference types="vitest/config" />
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

/**
 * Liefert die Design-Entwürfe aus `design/explorations/` im Dev-Server als reine statische
 * Dateien aus, unter `<base>design/explorations/`. Ohne diese Middleware würde Vite die Seiten
 * transformieren (gelockerte CSP, eigener CSS-Cache, der Änderungen nicht immer übernimmt).
 * So gilt dort die strenge CSP aus den Seiten selbst. Die Entwürfe gehören nicht zum App-Build.
 */
function serveDesignExplorations(): Plugin {
  const root = fileURLToPath(new URL('./design/explorations/', import.meta.url));
  const contentTypes: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
  };
  return {
    name: 'wandelbar:design-explorations',
    apply: 'serve',
    configureServer(server) {
      const prefix = `${server.config.base}design/explorations/`;
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0] ?? '';
        if (!pathname.startsWith(prefix)) {
          next();
          return;
        }
        const relative = decodeURIComponent(pathname.slice(prefix.length)) || 'index.html';
        const file = path.resolve(root, relative);
        if (!file.startsWith(root)) {
          res.statusCode = 403;
          res.end();
          return;
        }
        readFile(file).then(
          (data) => {
            res.setHeader(
              'Content-Type',
              contentTypes[path.extname(file)] ?? 'application/octet-stream',
            );
            res.setHeader('Cache-Control', 'no-store');
            res.end(data);
          },
          () => {
            next();
          },
        );
      });
    },
  };
}

/**
 * Legt die Lizenztexte selbst gehosteter Schriften in den Build (`licenses/`). Die OFL verlangt den
 * Text bei jeder Weitergabe der Schrift; `build.license` erfasst über CSS eingebundene Pakete nicht.
 */
function bundleFontLicenses(): Plugin {
  const fonts: Record<string, string> = {
    'albert-sans-OFL.txt': './node_modules/@fontsource-variable/albert-sans/LICENSE',
  };
  return {
    name: 'wandelbar:font-licenses',
    apply: 'build',
    async generateBundle() {
      for (const [fileName, source] of Object.entries(fonts)) {
        this.emitFile({
          type: 'asset',
          fileName: `licenses/${fileName}`,
          source: await readFile(fileURLToPath(new URL(source, import.meta.url))),
        });
      }
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
      // Zweite Seite: die Übersicht des Design-Systems (bausteine.html), siehe D-023.
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
          bausteine: fileURLToPath(new URL('./bausteine.html', import.meta.url)),
        },
      },
    },
    plugins: [
      react(),
      devContentSecurityPolicy(),
      serveDesignExplorations(),
      bundleFontLicenses(),
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
          // Der Service Worker der Hauptversion darf die Vorschau nie ausliefern, auch nicht
          // unter `/wandelbar/preview` ohne Schrägstrich (so tippt man es am Handy oft ein).
          navigateFallbackDenylist:
            channel === 'production' ? [/^\/wandelbar\/preview(?:[/?]|$)/] : [],
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
