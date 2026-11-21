import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import {
  axeViolations,
  collapseCard,
  collectErrors,
  goToStep,
  openApp,
  openCard,
  room,
  scene,
  tools,
} from './app.ts';

/**
 * Barrierefreiheit der App (WCAG 2.2 AA mit axe) in jedem Schritt, hell und dunkel, am PC und auf
 * dem Handy: mit offenen Karten, Katalog, Menü, Suche und Einführung, am Tag und am Abend.
 */

/** Prüft den aktuellen Zustand; `where` erscheint in der Meldung, wenn axe etwas findet */
async function expectAccessible(page: Page, where: string) {
  expect(await axeViolations(page), where).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`Barrierefreiheit (${colorScheme === 'light' ? 'hell' : 'dunkel'})`, () => {
    test.use({ colorScheme });

    test('Start mit Einführung, Projektmenü und Befehlssuche', async ({ page }) => {
      const errors = collectErrors(page);
      await openApp(page, { tour: true });
      const tour = page.getByRole('dialog', { name: 'Willkommen in der Lindenstraße 12' });
      await expect(tour).toBeVisible();
      await expectAccessible(page, 'Einführung');
      await tour.getByRole('button', { name: 'Weiter' }).click();
      await expect(
        page.getByRole('dialog', { name: 'Vier Schritte bis zum Rundgang' }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await page.getByRole('button', { name: /Wohnung: Lindenstraße 12/ }).click();
      await expect(page.getByRole('button', { name: 'Neue Wohnung aus Grundriss' })).toBeVisible();
      await expectAccessible(page, 'Projektmenü');
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: /Suchen oder Befehl/ }).click();
      await expect(page.getByRole('dialog', { name: 'Befehlssuche' })).toBeVisible();
      await expectAccessible(page, 'Befehlssuche');
      expect(errors).toEqual([]);
    });

    test('Beispielwohnung: Erleben, Einrichten, Bauen und Grundriss', async ({ page }) => {
      test.setTimeout(90_000);
      const errors = collectErrors(page);
      await openApp(page);

      // Erleben am Tag und am Abend
      await expectAccessible(page, 'Erleben am Tag');
      await page
        .getByRole('group', { name: 'Licht' })
        .getByRole('button', { name: 'Abend' })
        .click();
      await expect(scene(page)).toHaveAccessibleName(/um 21:30 Uhr/);
      await expectAccessible(page, 'Erleben am Abend');

      // Einrichten: Draufsicht mit Karte, Katalog, Flächen und Puppenhaus
      await goToStep(page, 'Einrichten');
      await page.getByRole('button', { name: /Suchen oder Befehl/ }).click();
      const search = page.getByRole('dialog', { name: 'Befehlssuche' });
      await search.getByRole('combobox').fill('Sofa');
      await search.getByRole('option', { name: /Sofa, 3-Sitzer/ }).click();
      await openCard(page, 'Sofa, 3-Sitzer');
      await expectAccessible(page, 'Einrichten mit Karte des Sofas');

      await collapseCard(page);
      await tools(page).getByRole('button', { name: 'Möbel' }).click();
      await expect(page.getByRole('region', { name: 'Möbel' })).toBeVisible();
      await expectAccessible(page, 'Katalog');
      await page.keyboard.press('Escape');

      await collapseCard(page);
      await tools(page).getByRole('button', { name: 'Flächen' }).click();
      // Unten rechts auf dem Küchenboden steht kein Möbel
      const kitchen = room(page, 'kitchen').locator('.app-floor');
      const area = await kitchen.boundingBox();
      await kitchen.click({
        position: { x: (area?.width ?? 40) - 16, y: (area?.height ?? 40) - 16 },
      });
      await openCard(page, 'Küche');
      await expectAccessible(page, 'Flächen der Küche');

      await collapseCard(page);
      await page
        .getByRole('group', { name: 'Ansicht' })
        .getByRole('button', { name: 'Puppenhaus' })
        .click();
      await expect(scene(page)).toHaveAccessibleName('Lindenstraße 12 als Puppenhaus');
      await expectAccessible(page, 'Einrichten im Puppenhaus');

      // Bauen mit Karte einer Wand
      await goToStep(page, 'Bauen');
      await collapseCard(page);
      await room(page, 'work').click();
      await openCard(page, 'Arbeitszimmer');
      await expectAccessible(page, 'Bauen mit Karte eines Raums');

      // Grundriss: fertig gelesener Plan
      await goToStep(page, 'Grundriss');
      await expect(page.getByRole('complementary', { name: 'Grundriss' })).toBeVisible();
      await expectAccessible(page, 'Grundriss fertig');
      expect(errors).toEqual([]);
    });

    test('eigene Wohnung: Ablegen, Erkennung, Maßstab, Norden und Bauen mit Hinweis', async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const errors = collectErrors(page);
      await openApp(page);
      await page.getByRole('button', { name: /Wohnung: Lindenstraße 12/ }).click();
      await page.getByRole('button', { name: 'Neue Wohnung aus Grundriss' }).click();
      await expect(
        page.getByRole('heading', { name: 'Leg deinen Grundriss auf den Tisch' }),
      ).toBeVisible();
      await expectAccessible(page, 'Grundriss ablegen');

      await page.getByRole('button', { name: 'Beispielplan nehmen' }).click();
      const panel = page.getByRole('complementary', { name: 'Grundriss' });
      await expect(panel.getByRole('heading', { name: 'Wandelbar liest den Plan' })).toBeVisible();
      await expectAccessible(page, 'Erkennung');

      await expect(panel.getByRole('heading', { name: 'Stimmt der Maßstab?' })).toBeVisible({
        timeout: 10_000,
      });
      await panel.getByRole('button', { name: 'Strecke nachmessen' }).click();
      await expectAccessible(page, 'Maßstab nachmessen');
      await panel.getByRole('button', { name: 'Maßstab übernehmen' }).click();

      await expect(panel.getByRole('heading', { name: 'Wo ist Norden?' })).toBeVisible();
      await expectAccessible(page, 'Norden');
      await panel.getByRole('button', { name: 'Weiß ich nicht' }).click();

      await expect(page.getByRole('region', { name: 'Erkennung' })).toBeVisible();
      await expectAccessible(page, 'Bauen mit Hinweis der Erkennung');
      await page
        .getByRole('region', { name: 'Erkennung' })
        .getByRole('button', { name: 'Zeigen' })
        .click();
      await openCard(page, 'Tür zum Wohnzimmer');
      await expectAccessible(page, 'Bauen mit unsicherer Tür');
      expect(errors).toEqual([]);
    });
  });
}
