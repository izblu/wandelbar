import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import {
  center,
  collectErrors,
  drag,
  goToStep,
  isPhone,
  openApp,
  scene,
  tools,
  unionBox,
  type Box,
} from './app.ts';

/**
 * Bedienung der Szene: Zoom, Drehen, Verschieben, Möbel per Tastatur und Licht (D-026, D-031,
 * D-032). Das Puppenhaus ist ein SVG-Platzhalter; gemessen wird, wo die Wohnung auf dem
 * Bildschirm liegt, nicht wie sie gezeichnet ist.
 */

/** Alle Böden des Puppenhauses: ihr Umriss ist der Umriss der Wohnung auf dem Bildschirm */
const floors = (page: Page) => page.locator('.app-dh-floor');

/** Ein Punkt auf der Bühne, an dem keine Leiste liegt */
async function freeSpot(page: Page) {
  const box = await scene(page).boundingBox();
  if (!box) throw new Error('Keine Szene');
  return { x: box.x + box.width * 0.62, y: box.y + box.height * 0.45 };
}

function expectMovedBy(after: Box, before: Box, by: { x: number; y: number }) {
  expect(after.x - before.x).toBeCloseTo(by.x, 0);
  expect(after.y - before.y).toBeCloseTo(by.y, 0);
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
}

test('Zoom: Plus, Minus und 0 ohne Strg, nicht in der Befehlssuche', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'Zoom-Knöpfe und Tasten gibt es am PC.');
  await openApp(page);
  const zoom = page.getByRole('group', { name: 'Zoom' });
  const value = zoom.getByRole('status');
  await expect(value).toHaveText('100 %');

  await page.keyboard.press('+');
  await expect(value).toHaveText('125 %');
  await page.keyboard.press('+');
  await expect(value).toHaveText('156 %');
  await page.keyboard.press('-');
  await expect(value).toHaveText('125 %');
  await page.keyboard.press('0');
  await expect(value).toHaveText('100 %');

  // Strg+Plus bleibt der Zoom des Browsers (WCAG 1.4.4)
  await page.keyboard.down('Control');
  await page.keyboard.press('+');
  await page.keyboard.up('Control');
  await expect(value).toHaveText('100 %');

  // In der Befehlssuche wird getippt, nicht gezoomt
  await page.keyboard.press('Control+k');
  const search = page.getByRole('dialog', { name: 'Befehlssuche' });
  await search.getByRole('combobox').press('+');
  await expect(search.getByRole('combobox')).toHaveValue('+');
  await page.keyboard.press('Escape');
  await expect(search).toBeHidden();
  await expect(value).toHaveText('100 %');

  // Knöpfe und Grenzen: 25 bis 800 %
  await zoom.getByRole('button', { name: 'Vergrößern' }).click();
  await expect(value).toHaveText('125 %');
  for (let index = 0; index < 10; index += 1) await page.keyboard.press('-');
  await expect(value).toHaveText('25 %');
  await expect(zoom.getByRole('button', { name: 'Verkleinern' })).toBeDisabled();
  await zoom.getByRole('button', { name: 'Einpassen' }).click();
  await expect(value).toHaveText('100 %');

  // Auch in der Draufsicht
  await goToStep(page, 'Einrichten');
  await page.keyboard.press('+');
  await expect(value).toHaveText('125 %');

  // Die Prozentzahl bleibt einzeilig, auch bei knapp 1000 px Breite, wo die Ansichtsleiste in
  // Einrichten voll ist und die Ziffern von Albert Sans verschieden breit sind
  await page.setViewportSize({ width: 1000, height: 720 });
  const line = (await value.boundingBox())?.height ?? 0;
  expect(line).toBeGreaterThan(0);
  for (let index = 0; index < 9; index += 1) {
    const shown = (await value.textContent()) ?? '';
    await page.keyboard.press('+');
    await expect(value).not.toHaveText(shown);
    expect((await value.boundingBox())?.height, `${shown} → +`).toBeCloseTo(line, 0);
  }
  await expect(value).toHaveText('800 %');
});

test('Drehen nach Herauszoomen: Die Wohnung bleibt an ihrem Platz', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page);
  const box = await scene(page).boundingBox();
  if (!box) throw new Error('Keine Szene');
  const fitted = await unionBox(floors(page));

  // Mit dem Mausrad oben links herauszoomen: Die Wohnung rückt aus der Bildmitte, die Bildmitte
  // sitzt danach an ihrem Rand fest. Auf dem Handy bringt ein Schritt des Rads weniger.
  await page.mouse.move(box.x + 140, box.y + 160);
  await expect(async () => {
    await page.mouse.wheel(0, 400);
    expect((await unionBox(floors(page))).width).toBeLessThan(fitted.width * 0.75);
  }).toPass();
  const before = await unionBox(floors(page));

  // Drehen: Gedreht wird um die Mitte der sichtbaren Wohnung, sie bleibt stehen
  await drag(page, await freeSpot(page), { x: 160, y: 0 });
  const after = await unionBox(floors(page));
  expect(Math.abs(after.width - before.width)).toBeGreaterThan(5);
  expect(center(after).x).toBeCloseTo(center(before).x, 0);
  expect(center(after).y).toBeCloseTo(center(before).y, 0);
  expect(errors).toEqual([]);
});

test('Verschieben: Werkzeug (Taste H), Leertaste, rechte Maustaste und Pfeiltasten', async ({
  page,
}, testInfo) => {
  await openApp(page);
  const pan = tools(page).getByRole('button', { name: 'Verschieben' });
  const look = tools(page).getByRole('button', { name: 'Umsehen' });

  // Werkzeug wählen: am PC mit H, auf dem Handy per Antippen
  if (isPhone(testInfo)) await pan.click();
  else await page.keyboard.press('h');
  await expect(pan).toHaveAttribute('aria-pressed', 'true');
  await expect(scene(page)).toHaveAttribute('data-grab', '');

  let before = await unionBox(floors(page));
  await drag(page, await freeSpot(page), { x: 80, y: 40 });
  const after = await unionBox(floors(page));
  expectMovedBy(after, before, { x: 80, y: 40 });

  // Pfeiltasten verschieben, solange kein Möbel gewählt ist: Die Ansicht wandert nach rechts
  await scene(page).focus();
  before = after;
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await unionBox(floors(page))).x).toBeCloseTo(before.x - 48, 0);

  // Zurück zu Umsehen: Pfeiltasten drehen, mit Umschalt verschieben sie
  if (isPhone(testInfo)) await look.click();
  else await page.keyboard.press('u');
  await expect(look).toHaveAttribute('aria-pressed', 'true');
  await expect(scene(page)).not.toHaveAttribute('data-grab');
  await scene(page).focus();
  before = await unionBox(floors(page));
  await page.keyboard.press('Shift+ArrowLeft');
  await expect.poll(async () => (await unionBox(floors(page))).x).toBeCloseTo(before.x + 48, 0);
  before = await unionBox(floors(page));
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => (await unionBox(floors(page))).width)
    .not.toBeCloseTo(before.width, 0);

  // Leertaste halten: Ziehen verschiebt, ohne das Werkzeug zu wechseln. Vorher einpassen, damit
  // die Bildmitte nicht an den Rand der Wohnung stößt (die Sperre aus D-031)
  await page.keyboard.press('0');
  before = await unionBox(floors(page));
  await page.keyboard.down('Space');
  await expect(scene(page)).toHaveAttribute('data-grab', '');
  await drag(page, await freeSpot(page), { x: 60, y: 0 });
  await page.keyboard.up('Space');
  await expect(scene(page)).not.toHaveAttribute('data-grab');
  expectMovedBy(await unionBox(floors(page)), before, { x: 60, y: 0 });

  // Rechte Maustaste verschiebt wie in 3D-Programmen
  await page.keyboard.press('0');
  before = await unionBox(floors(page));
  await drag(page, await freeSpot(page), { x: -50, y: 0 }, { button: 'right' });
  expectMovedBy(await unionBox(floors(page)), before, { x: -50, y: 0 });
  await expect(look).toHaveAttribute('aria-pressed', 'true');
});

test('Puppenhaus in Einrichten: Pfeiltasten bewegen das gewählte Möbel in Bildrichtung, nicht die Ansicht', async ({
  page,
}) => {
  await openApp(page);
  await goToStep(page, 'Einrichten');
  await page
    .getByRole('group', { name: 'Ansicht' })
    .getByRole('button', { name: 'Puppenhaus' })
    .click();
  await expect(scene(page)).toHaveAccessibleName('Lindenstraße 12 als Puppenhaus');

  // Um 180° drehen (12 × 15°): Das Sofa wechselt im Bild auf die andere Seite der Wohnung. Pfeil
  // rechts muss es trotzdem nach rechts im Bild schieben, nicht in Richtung der Wohnung (D-034).
  const sofa = page.locator('[data-hit="furniture:sofa"]');
  const side = async () => center(await unionBox(sofa)).x - center(await unionBox(floors(page))).x;
  expect(await side()).toBeGreaterThan(10);
  await scene(page).focus();
  for (let index = 0; index < 12; index += 1) await page.keyboard.press('ArrowRight');
  await expect.poll(side).toBeLessThan(-10);
  const turned = await unionBox(sofa);

  // Das Sofa über die Befehlssuche wählen; die Ansicht bleibt gedreht
  await page.getByRole('button', { name: /Suchen oder Befehl/ }).click();
  const search = page.getByRole('dialog', { name: 'Befehlssuche' });
  await search.getByRole('combobox').fill('Sofa');
  await search.getByRole('option', { name: /Sofa, 3-Sitzer/ }).click();
  await expect(page.getByRole('region', { name: 'Sofa, 3-Sitzer' })).toBeVisible();
  const undo = tools(page).getByRole('button', { name: 'Rückgängig' });
  await expect(undo).toBeDisabled();

  const view = await unionBox(floors(page));
  const placed = await unionBox(sofa);
  expect(placed).toEqual(turned);
  await scene(page).focus();

  // Rechts: nach rechts im Bild, ohne Versatz nach oben oder unten
  await page.keyboard.press('ArrowRight');
  await expect(undo).toBeEnabled();
  await expect.poll(async () => (await unionBox(sofa)).x).toBeGreaterThan(placed.x + 0.5);
  let moved = await unionBox(sofa);
  expect(moved.y).toBeCloseTo(placed.y, 1);
  expect(await unionBox(floors(page))).toEqual(view);

  // Runter: nach unten im Bild, ohne Versatz zur Seite
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await unionBox(sofa)).y).toBeGreaterThan(moved.y + 0.5);
  expect((await unionBox(sofa)).x).toBeCloseTo(moved.x, 1);

  // Links und hoch: zurück an den Platz
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => (await unionBox(sofa)).x).toBeCloseTo(placed.x, 1);
  moved = await unionBox(sofa);
  expect(moved.y).toBeCloseTo(placed.y, 1);

  // Ohne gewähltes Möbel drehen die Pfeiltasten wieder die Ansicht
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Sofa, 3-Sitzer' })).toBeHidden();
  await scene(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => (await unionBox(floors(page))).width)
    .not.toBeCloseTo(view.width, 0);
});

test('Licht: um 15:30 Uhr Sonne mit Schatten, abends leuchten die Lampen', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page);
  const time = page.getByRole('slider', { name: 'Tageszeit' });
  const light = page.getByRole('group', { name: 'Licht' });

  await time.fill('15.5');
  await expect(time).toHaveAttribute('aria-valuetext', '15:30 Uhr');
  await expect(scene(page)).toHaveAccessibleName('Lindenstraße 12 als Puppenhaus um 15:30 Uhr');
  await expect(page.locator('.app-light-sun')).not.toHaveCount(0);
  await expect(page.locator('.app-light-shadow')).not.toHaveCount(0);
  await expect(page.locator('.app-daylight')).toHaveCount(1);
  await expect(page.locator('.app-light-lamp')).toHaveCount(0);

  await light.getByRole('button', { name: 'Abend' }).click();
  await expect(time).toHaveAttribute('aria-valuetext', '21:30 Uhr');
  await expect(page.locator('.app-light-lamp')).not.toHaveCount(0);
  await expect(page.locator('radialGradient[data-kind="lamp"]')).not.toHaveCount(0);
  await expect(page.locator('.app-light-sun')).toHaveCount(0);
  await expect(page.locator('.app-daylight')).toHaveCount(0);

  await light.getByRole('button', { name: 'Planung' }).click();
  await expect(page.locator('.app-glow, .app-daylight')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Draufsicht um 18:30 Uhr: Der Teppich in der Sonne bleibt anklickbar', async ({ page }) => {
  await openApp(page);
  await goToStep(page, 'Einrichten');
  const time = page.getByRole('slider', { name: 'Tageszeit' });
  await time.fill('18.5');
  await expect(time).toHaveAttribute('aria-valuetext', '18:30 Uhr');

  // Ein Punkt auf dem Teppich, auf den die Sonne fällt und der nicht unter einem Möbel liegt
  const spot = await page.evaluate(() => {
    const rug = document.querySelector('[data-hit="furniture:rug"]');
    const suns = [...document.querySelectorAll<SVGPolygonElement>('.app-sun')];
    if (!rug || suns.length === 0) return null;
    const box = rug.getBoundingClientRect();
    for (let y = box.top + 3; y < box.bottom; y += 4) {
      for (let x = box.left + 3; x < box.right; x += 4) {
        const hit = document.elementFromPoint(x, y)?.closest('[data-hit]');
        if (hit?.getAttribute('data-hit') !== 'furniture:rug') continue;
        const inSun = suns.some((sun) => {
          const matrix = sun.getScreenCTM();
          return matrix
            ? sun.isPointInFill(new DOMPoint(x, y).matrixTransform(matrix.inverse()))
            : false;
        });
        if (inSun) return { x, y };
      }
    }
    return null;
  });
  expect(spot, 'Sonne auf dem freien Teil des Teppichs').not.toBeNull();
  if (!spot) return;
  await page.mouse.click(spot.x, spot.y);
  await expect(page.getByRole('region', { name: 'Teppich, Wolle' })).toBeVisible();

  // Im Puppenhaus bleibt der Rand des gewählten Teppichs auch in der Sonne zu sehen
  await page
    .getByRole('group', { name: 'Ansicht' })
    .getByRole('button', { name: 'Puppenhaus' })
    .click();
  await time.fill('15.5');
  await expect(page.locator('.app-light-keep')).not.toHaveCount(0);
});
