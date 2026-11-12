import { defineConfig, devices } from '@playwright/test';

/** Eigener Port, damit ein laufendes `npm run preview` (4173) nicht stört. */
const PORT = 4317;
const BASE_URL = `http://localhost:${String(PORT)}/wandelbar/`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Keine Wiederholungen: Ein sporadischer Datenschutz-Fehler darf nicht durchrutschen.
  retries: 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'pixel', use: { ...devices['Pixel 7'] } },
  ],
  // Getestet wird immer der Produktions-Build, denn nur dort sind Service Worker und strikte CSP aktiv.
  webServer: {
    command: `npm run build && npm run preview -- --port ${String(PORT)} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      WANDELBAR_CHANNEL: 'production',
    },
  },
});
