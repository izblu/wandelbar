import { expect, test } from './fixtures.ts';

/** Die Content-Security-Policy genau so, wie sie in docs/PLAN.md steht. */
const PLAN_CSP =
  "default-src 'self'; connect-src 'self'; img-src 'self' blob: data:; worker-src 'self' blob:; script-src 'self' 'wasm-unsafe-eval'";

/** Nicht auflösbare Adresse (RFC 2606) für die Gegenproben; sie verlässt den Rechner nie. */
const FOREIGN_URL = 'https://tracker.invalid/pixel';

test.describe('Datenschutz', () => {
  test('lädt nur von der eigenen Adresse und verletzt die CSP nicht', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: 'Wandelbar' })).toBeVisible();

    // Zweiter Durchlauf, nachdem der Service Worker übernommen hat.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Wandelbar' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    // Die Prüfung auf fremde Anfragen und CSP-Verstöße übernimmt der Wächter aus fixtures.ts.
  });

  test('setzt die Content-Security-Policy genau wie im Plan', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
      'content',
      PLAN_CSP,
    );
  });

  test.describe('Gegenproben: Der Wächter schlägt an', () => {
    test.use({ expectPrivacyViolations: true });

    test('die CSP blockiert eine fremde Verbindung, bevor sie gesendet wird', async ({
      page,
      privacy,
    }) => {
      await page.goto('./');
      const blocked = await page.evaluate(async (url) => {
        try {
          await fetch(url);
          return false;
        } catch {
          return true;
        }
      }, FOREIGN_URL);

      expect(blocked).toBe(true);
      await expect.poll(() => privacy.cspViolations).toContain(`connect-src -> ${FOREIGN_URL}`);
      expect(privacy.foreignRequests).toEqual([]);
    });

    test('eine fremde Anfrage wird erkannt und abgebrochen', async ({ page, privacy }) => {
      await page.goto(FOREIGN_URL).catch(() => undefined);
      expect(privacy.foreignRequests).toContain(FOREIGN_URL);
    });
  });
});
