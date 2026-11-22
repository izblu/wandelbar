import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/** Wartet, bis der Service Worker aktiv ist (Vorab-Cache gefüllt) und die Seite steuert. */
async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        resolve();
      });
    });
  });
}

test.describe('Offline', () => {
  test('die App erscheint nach dem ersten Besuch auch ohne Netz', async ({ page, context }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: 'Wandelbar' })).toBeVisible();
    await waitForServiceWorker(page);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole('heading', { level: 1, name: 'Wandelbar' })).toBeVisible();
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  });

  test('der Service Worker der Hauptversion liefert die Vorschau nie aus', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: 'Wandelbar' })).toBeVisible();
    await waitForServiceWorker(page);

    // Mit und ohne Schrägstrich, auch mit Suchanfrage: Die Antwort kommt vom Server.
    for (const path of ['preview/', 'preview', 'preview?quelle=handy']) {
      const response = await page.goto(path);
      expect(response?.fromServiceWorker(), path).toBe(false);
    }

    // Gegenprobe: Ein anderer Pfad der App kommt aus dem Service Worker.
    const fallback = await page.goto('preview-nicht');
    expect(fallback?.fromServiceWorker()).toBe(true);
  });
});
