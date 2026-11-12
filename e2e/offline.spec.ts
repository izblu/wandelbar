import { expect, test } from './fixtures.ts';

test.describe('Offline', () => {
  test('die App erscheint nach dem ersten Besuch auch ohne Netz', async ({ page, context }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: 'Wandelbar' })).toBeVisible();

    // Warten, bis der Service Worker aktiv ist (Vorab-Cache gefüllt) und die Seite steuert.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (navigator.serviceWorker.controller) return;
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          resolve();
        });
      });
    });

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole('heading', { level: 1, name: 'Wandelbar' })).toBeVisible();
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  });
});
