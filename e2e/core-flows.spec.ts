import { expect, test } from './fixtures.ts';
import {
  collapseCard,
  collectErrors,
  goToStep,
  isPhone,
  openApp,
  openCard,
  room,
  scene,
  step,
  tools,
} from './app.ts';

/**
 * Kernabläufe des Prototyps: eine eigene Wohnung vom Ablegen des Grundrisses bis zum Erleben.
 * Erkennung und 3D sind im Prototyp gespielt; geprüft wird die Bedienung, die bleibt.
 */

test('eigene Wohnung: Grundriss ablegen, Maßstab, Norden, Bauen, Einrichten, Erleben', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  await openApp(page);

  /* ------------------------------------------------------------------ Grundriss */

  await page.getByRole('button', { name: /Wohnung: Lindenstraße 12/ }).click();
  await page.getByRole('button', { name: 'Neue Wohnung aus Grundriss' }).click();
  await expect(step(page, 'Grundriss')).toHaveAttribute('aria-current', 'step');

  // Bauen ist noch gesperrt: Erst kommt der Grundriss
  await step(page, 'Bauen').click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Lade zuerst einen Grundriss' }),
  ).toBeVisible();
  await expect(step(page, 'Grundriss')).toHaveAttribute('aria-current', 'step');

  // Eine Datei auf den Tisch ziehen und loslassen
  const table = page.getByRole('region', { name: /Grundriss auf den Tisch|Loslassen/ });
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['plan'], 'mein-grundriss.png', { type: 'image/png' }));
    return transfer;
  });
  await table.dispatchEvent('dragover', { dataTransfer });
  await expect(
    page.getByRole('heading', { name: 'Loslassen, um den Plan zu laden' }),
  ).toBeVisible();
  await table.dispatchEvent('drop', { dataTransfer });

  // Gespielte Erkennung
  const panel = page.getByRole('complementary', { name: 'Grundriss' });
  await expect(panel.getByRole('heading', { name: 'Wandelbar liest den Plan' })).toBeVisible();
  await expect(panel.getByText('mein-grundriss.png')).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Grundriss Meine Wohnung, wird gelesen' }),
  ).toBeVisible();

  // Maßstab: erst eine falsche Länge, dann die richtige
  await expect(panel.getByRole('heading', { name: 'Stimmt der Maßstab?' })).toBeVisible({
    timeout: 10_000,
  });
  const verdict = panel.getByRole('status');
  await expect(verdict).toHaveText(/Passt, nur 0,3 % Unterschied/);
  await panel.getByRole('button', { name: 'Strecke nachmessen' }).click();
  const length = panel.getByRole('textbox', { name: 'Länge der markierten Wand in cm' });
  await length.fill('700');
  await length.press('Enter');
  await expect(verdict).toHaveText(/41 % Unterschied zum Plan: Stimmt die Länge\?/);
  await length.fill('600');
  await length.press('Enter');
  await expect(verdict).toHaveText(/Passt, nur 3,8 % Unterschied/);
  await panel.getByRole('button', { name: 'Maßstab übernehmen' }).click();

  // Norden: Die Sonnenflecken um 15:30 Uhr schwenken mit
  await expect(panel.getByRole('heading', { name: 'Wo ist Norden?' })).toBeVisible();
  const sun = page.locator('.app-paper-sun polygon');
  await expect(sun).not.toHaveCount(0);
  const before = await sun.first().getAttribute('points');
  const north = panel.getByRole('slider', { name: 'Norden' });
  await expect(north).toHaveAttribute('aria-valuetext', 'zeigt nach oben, 0 Grad');
  await north.focus();
  for (let index = 0; index < 18; index += 1) await page.keyboard.press('ArrowRight');
  await expect(north).toHaveAttribute('aria-valuetext', 'zeigt nach rechts, 90 Grad');
  await expect(sun).not.toHaveCount(0);
  expect(await sun.first().getAttribute('points')).not.toBe(before);
  await panel.getByRole('button', { name: 'Weiter zu Bauen' }).click();

  /* ------------------------------------------------------------------ Bauen */

  await expect(step(page, 'Bauen')).toHaveAttribute('aria-current', 'step');
  const banner = page.getByRole('region', { name: 'Erkennung' });
  await expect(banner).toContainText('11 Wände, 6 Türen und 8 Fenster erkannt.');
  await expect(banner).toContainText('2 Stellen sind unsicher.');

  // Die erste unsichere Stelle zeigen und bestätigen
  await banner.getByRole('button', { name: 'Zeigen' }).click();
  const door = await openCard(page, 'Tür zum Wohnzimmer');
  await expect(door).toContainText('Unsicher erkannt: Ist hier wirklich eine Tür?');
  await door.getByRole('button', { name: 'Ja, stimmt' }).click();
  await expect(banner).toContainText('1 Stelle ist unsicher.');
  await banner.getByRole('button', { name: 'Alles übernehmen' }).click();
  await expect(banner).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'Alles übernommen.' })).toBeVisible();

  // Einen Raum antippen und umbenennen, dann rückgängig machen
  await room(page, 'sleep').click();
  const sleep = await openCard(page, 'Schlafzimmer');
  // 14 m² im Plan, nachgemessen mit 600 statt 588 cm: 14 · (600 / 588)² ≈ 14,6 m²
  await expect(sleep).toContainText('14,6 m²');
  await sleep.getByRole('textbox', { name: 'Name' }).fill('Gästezimmer');
  await expect(page.getByRole('region', { name: 'Gästezimmer' })).toBeVisible();
  // Auf dem Handy liegt die aufgeklappte Karte über der Werkzeugleiste
  await collapseCard(page);
  await tools(page).getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByRole('region', { name: 'Schlafzimmer' })).toBeVisible();

  // Werkzeuge, die erst später kommen, sagen das
  await tools(page).getByRole('button', { name: 'Wand' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Wände zeichnen kommt' })).toBeVisible();

  /* ------------------------------------------------------------------ Einrichten */

  await goToStep(page, 'Einrichten');
  await expect(scene(page)).toHaveAccessibleName('Meine Wohnung von oben, eingerichtet');

  // Ein Möbel aus dem Katalog holen, drehen und wieder löschen
  await tools(page).getByRole('button', { name: 'Möbel' }).click();
  const catalog = page.getByRole('region', { name: 'Möbel' });
  await catalog.getByRole('button', { name: /^Sessel/ }).click();
  await expect(catalog).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'Sessel steht jetzt im' })).toBeVisible();
  const chair = page.getByRole('region', { name: 'Sessel' });
  await expect(chair).toBeVisible();
  await chair.getByRole('button', { name: 'Drehen' }).click();
  await chair.getByRole('button', { name: 'Löschen' }).click();
  await expect(chair).toBeHidden();

  // Flächen: Wandfarbe des Wohnzimmers ändern
  await tools(page).getByRole('button', { name: 'Flächen' }).click();
  await expect(page.getByText('Tippe einen Raum an, um Wände und Boden zu ändern.')).toBeVisible();
  await room(page, 'living').click();
  const living = await openCard(page, 'Wohnzimmer');
  await living.getByRole('radio', { name: 'Salbei' }).check();
  await expect(living.getByRole('group', { name: /Wände/ })).toHaveAccessibleName(/Salbei/);
  await expect(room(page, 'living').locator('.app-paint')).toHaveAttribute('style', /paint-sage/);

  // Puppenhaus statt Draufsicht
  await collapseCard(page);
  await page
    .getByRole('group', { name: 'Ansicht' })
    .getByRole('button', { name: 'Puppenhaus' })
    .click();
  await expect(scene(page)).toHaveAccessibleName('Meine Wohnung als Puppenhaus');

  /* ------------------------------------------------------------------ Erleben */

  await goToStep(page, 'Erleben');
  await expect(scene(page)).toHaveAccessibleName('Meine Wohnung als Puppenhaus um 16:30 Uhr');
  const light = page.getByRole('group', { name: 'Licht' });
  await light.getByRole('button', { name: 'Abend' }).click();
  await expect(scene(page)).toHaveAccessibleName('Meine Wohnung als Puppenhaus um 21:30 Uhr');
  await expect(page.getByRole('slider', { name: 'Tageszeit' })).toHaveAttribute(
    'aria-valuetext',
    '21:30 Uhr',
  );
  await light.getByRole('button', { name: 'Planung' }).click();
  await expect(scene(page)).toHaveAccessibleName('Meine Wohnung als Puppenhaus');
  await expect(page.getByRole('slider', { name: 'Tageszeit' })).toBeHidden();

  // Rundgang kommt mit dem echten 3D
  await tools(page).getByRole('button', { name: 'Rundgang' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Der Rundgang kommt mit dem echten 3D' }),
  ).toBeVisible();

  // Alle Schritte sind jetzt erreicht; zurück zur Beispielwohnung über das Menü
  for (const name of ['Grundriss', 'Bauen', 'Einrichten']) {
    await expect(step(page, name)).toHaveAccessibleName(new RegExp(`^${name} ?, erledigt$`));
  }
  await page.getByRole('button', { name: /Wohnung: Meine Wohnung/ }).click();
  await page.getByRole('button', { name: /Lindenstraße 12/ }).click();
  await expect(scene(page)).toHaveAccessibleName(/^Lindenstraße 12 als Puppenhaus/);

  expect(errors, isPhone(testInfo) ? 'Handy' : 'PC').toEqual([]);
});

test('Wechsel zwischen den Wohnungen: zurück in den zuletzt geöffneten Schritt, ohne Hinweis', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  await openApp(page);
  const hint = page.getByRole('status').filter({ hasText: 'Lade zuerst einen Grundriss' });
  const project = page.getByRole('button', { name: /Wohnung: / });
  const sample = page.getByRole('button', { name: /^Lindenstraße 12\s*Beispiel/ });
  const own = page.getByRole('button', { name: /deine Wohnung$/ });
  const emptyTable = page.getByRole('heading', { name: 'Leg deinen Grundriss auf den Tisch' });

  /** Wechselt über das Menü und prüft, in welchem Schritt die Wohnung aufgeht */
  async function switchTo(item: typeof sample, name: string, stepName: string) {
    await project.click();
    await item.click();
    await expect(project).toHaveAccessibleName(new RegExp(`Wohnung: ${name}$`));
    await expect(step(page, stepName)).toHaveAttribute('aria-current', 'step');
    await expect(hint).toHaveCount(0);
  }

  // Die Beispielwohnung in Bauen verlassen, eine eigene ohne Grundriss anlegen
  await goToStep(page, 'Bauen');
  await project.click();
  await page.getByRole('button', { name: 'Neue Wohnung aus Grundriss' }).click();
  await expect(step(page, 'Grundriss')).toHaveAttribute('aria-current', 'step');
  await expect(emptyTable).toBeVisible();

  // Hin und her, solange die eigene Wohnung noch keinen Grundriss hat
  await switchTo(sample, 'Lindenstraße 12', 'Bauen');
  await switchTo(own, 'Neue Wohnung', 'Grundriss');
  await expect(emptyTable).toBeVisible();

  // Auch über die Befehlssuche
  await page.getByRole('button', { name: /Suchen oder Befehl/ }).click();
  const search = page.getByRole('dialog', { name: 'Befehlssuche' });
  await search.getByRole('combobox').fill('Beispielwohnung');
  await search.getByRole('option', { name: /Beispielwohnung öffnen/ }).click();
  await expect(project).toHaveAccessibleName(/Wohnung: Lindenstraße 12$/);
  await expect(step(page, 'Bauen')).toHaveAttribute('aria-current', 'step');
  await expect(hint).toHaveCount(0);

  // Die Beispielwohnung jetzt in Einrichten verlassen, die eigene bekommt ihren Grundriss
  await goToStep(page, 'Einrichten');
  await switchTo(own, 'Neue Wohnung', 'Grundriss');
  await page.getByRole('button', { name: 'Beispielplan nehmen' }).click();
  const panel = page.getByRole('complementary', { name: 'Grundriss' });
  await expect(panel.getByRole('heading', { name: 'Stimmt der Maßstab?' })).toBeVisible({
    timeout: 10_000,
  });
  await panel.getByRole('button', { name: 'Stimmt so' }).click();
  await panel.getByRole('button', { name: 'Weiß ich nicht' }).click();
  await expect(step(page, 'Bauen')).toHaveAttribute('aria-current', 'step');

  // Jede Wohnung geht dort auf, wo man sie verlassen hat
  await switchTo(sample, 'Lindenstraße 12', 'Einrichten');
  await switchTo(own, 'Meine Wohnung', 'Bauen');
  await goToStep(page, 'Erleben');
  await switchTo(sample, 'Lindenstraße 12', 'Einrichten');
  await switchTo(own, 'Meine Wohnung', 'Erleben');
  await expect(scene(page)).toHaveAccessibleName(/^Meine Wohnung als Puppenhaus/);
  expect(errors).toEqual([]);
});
