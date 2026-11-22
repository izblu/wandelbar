import { expect, test } from './fixtures.ts';
import { collectErrors, goToStep, openApp, openCard, room, tools, unionBox } from './app.ts';

/**
 * Tastatur in Einrichten (D-034): Kürzel nehmen Reglern, Farbfeldern und dem Projektmenü keine
 * Taste weg, und der Fokus findet nach dem Möbelkatalog seinen Weg zurück (WCAG 2.1.1, 2.4.3).
 */

test('Einrichten: Pfeiltasten stellen die Tageszeit und wählen die Wandfarbe', async ({ page }) => {
  const errors = collectErrors(page);
  await openApp(page);
  await goToStep(page, 'Einrichten');

  // Tageszeit in Schritten von 15 Minuten, ohne gewähltes Möbel
  const time = page.getByRole('slider', { name: 'Tageszeit' });
  await expect(time).toHaveAttribute('aria-valuetext', '16:30 Uhr');
  await time.focus();
  await page.keyboard.press('ArrowRight');
  await expect(time).toHaveAttribute('aria-valuetext', '16:45 Uhr');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(time).toHaveAttribute('aria-valuetext', '16:15 Uhr');

  // Wandfarbe der Küche: Unten rechts auf dem Küchenboden steht kein Möbel
  await tools(page).getByRole('button', { name: 'Flächen' }).click();
  const kitchen = room(page, 'kitchen').locator('.app-floor');
  const area = await kitchen.boundingBox();
  await kitchen.click({
    position: { x: (area?.width ?? 40) - 16, y: (area?.height ?? 40) - 16 },
  });
  const card = await openCard(page, 'Küche');
  const walls = card.getByRole('group', { name: /Wände/ });
  await expect(walls).toHaveAccessibleName(/Kalkweiß/);
  await walls.getByRole('radio', { name: 'Kalkweiß' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(walls.getByRole('radio', { name: 'Salbei' })).toBeChecked();
  await expect(walls.getByRole('radio', { name: 'Salbei' })).toBeFocused();
  await expect(walls).toHaveAccessibleName(/Salbei/);
  await expect(room(page, 'kitchen').locator('.app-paint')).toHaveAttribute('style', /paint-sage/);
  await page.keyboard.press('ArrowLeft');
  await expect(walls.getByRole('radio', { name: 'Kalkweiß' })).toBeChecked();
  expect(errors).toEqual([]);
});

test('Einrichten: Esc schließt erst das Projektmenü, dann die Auswahl', async ({ page }) => {
  await openApp(page);
  await goToStep(page, 'Einrichten');
  const project = page.getByRole('button', { name: /Wohnung: / });
  const menuItem = page.getByRole('button', { name: 'Neue Wohnung aus Grundriss' });

  // Ohne Auswahl
  await project.click();
  await expect(menuItem).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menuItem).toBeHidden();

  // Mit gewähltem Sofa: Das erste Esc gehört dem Menü, das zweite hebt die Auswahl auf
  await page.getByRole('button', { name: /Suchen oder Befehl/ }).click();
  const search = page.getByRole('dialog', { name: 'Befehlssuche' });
  await search.getByRole('combobox').fill('Sofa');
  await search.getByRole('option', { name: /Sofa, 3-Sitzer/ }).click();
  const sofa = page.getByRole('region', { name: 'Sofa, 3-Sitzer' });
  await expect(sofa).toBeVisible();
  await project.click();
  await expect(menuItem).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menuItem).toBeHidden();
  await expect(sofa).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sofa).toBeHidden();
});

test('Möbelkatalog: Esc und X geben den Fokus an „Möbel“ zurück, Pfeil rechts schiebt das neue Möbel', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await openApp(page);
  await goToStep(page, 'Einrichten');
  const furniture = tools(page).getByRole('button', { name: 'Möbel' });
  const select = tools(page).getByRole('button', { name: 'Auswählen' });
  const catalog = page.getByRole('region', { name: 'Möbel' });

  // Esc
  await furniture.click();
  await expect(catalog).toBeVisible();
  await expect(catalog.getByRole('button', { name: /^Sofa, 3-Sitzer/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(catalog).toBeHidden();
  await expect(furniture).toBeFocused();
  await expect(select).toHaveAttribute('aria-pressed', 'true');

  // X
  await furniture.click();
  await catalog.getByRole('button', { name: 'Katalog schließen' }).click();
  await expect(catalog).toBeHidden();
  await expect(furniture).toBeFocused();
  await expect(select).toHaveAttribute('aria-pressed', 'true');

  // Hinzufügen: Das neue Möbel ist gewählt, Pfeil rechts schiebt es um 5 cm nach rechts
  await furniture.click();
  await catalog.getByRole('button', { name: /^Sessel/ }).click();
  await expect(catalog).toBeHidden();
  await expect(page.getByRole('region', { name: 'Sessel', exact: true })).toBeVisible();
  await expect(furniture).not.toBeFocused();
  // Die Beispielwohnung hat schon einen Sessel (`armchair`); der neue bekommt eine eigene Kennung
  const added = page.locator('[data-hit^="furniture:armchair-"]');
  await expect(added).toHaveCount(1);
  const placed = await unionBox(added);
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await unionBox(added)).x).toBeGreaterThan(placed.x + 0.5);
  const moved = await unionBox(added);
  expect(moved.y).toBeCloseTo(placed.y, 1);
  expect(moved.width).toBeCloseTo(placed.width, 1);
  expect(errors).toEqual([]);
});
