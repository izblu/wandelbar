import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/**
 * Design-System auf der Übersichtsseite `bausteine.html`: Barrierefreiheit (axe, WCAG 2.2 AA) in
 * hell und dunkel, am PC und auf dem Handy, dazu Tastatur-Tests für jeden Baustein mit eigenem
 * Verhalten. axe findet keine Verhaltensfehler; dafür sind die Tastatur-Tests da.
 */

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/**
 * Wartet, bis alle endlichen Animationen fertig sind (z. B. das Einblenden der Befehlssuche mit
 * `dialog.animate()`). Sonst misst axe den Kontrast eines halb durchsichtigen Zwischenbilds.
 */
async function settleAnimations(page: Page) {
  await page.evaluate(async () => {
    const running = document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity);
    await Promise.allSettled(running.map((animation) => animation.finished));
  });
}

async function axeViolations(page: Page) {
  await settleAnimations(page);
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));
}

async function openShowcase(page: Page, isPhone: boolean) {
  await page.setViewportSize(isPhone ? PHONE : DESKTOP);
  await page.goto('./bausteine.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Bausteine' })).toBeVisible();
}

const isPhoneProject = (name: string) => name === 'pixel';

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`Übersichtsseite (${colorScheme === 'light' ? 'hell' : 'dunkel'})`, () => {
    test.use({ colorScheme });

    test('hat keine Verstöße gegen WCAG 2.2 AA, auch mit offener Karte und Suche', async ({
      page,
    }, testInfo) => {
      const errors = collectErrors(page);
      await openShowcase(page, isPhoneProject(testInfo.project.name));
      expect(await axeViolations(page)).toEqual([]);

      await page.getByRole('button', { name: 'Alle Eigenschaften zeigen' }).click();
      await expect(page.getByRole('button', { name: 'Eigenschaften einklappen' })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);

      await page.keyboard.press('Control+k');
      await expect(page.getByRole('dialog', { name: 'Befehlssuche' })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);

      expect(errors).toEqual([]);
    });
  });
}

test.describe('Tastatur am PC', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(isPhoneProject(testInfo.project.name), 'Tastatur-Tests laufen am PC.');
    await openShowcase(page, false);
  });

  test('Werkzeugpalette: ein Tab-Halt, Pfeiltasten, Pos1 und Ende', async ({ page }) => {
    const stage = page.getByRole('region', { name: 'Einrichten am PC' });
    const toolbar = stage.getByRole('toolbar', { name: 'Werkzeuge: Einrichten' });
    await expect(toolbar.locator('[tabindex="0"]')).toHaveCount(1);

    await toolbar.getByRole('button', { name: 'Auswählen' }).focus();
    await page.keyboard.press('ArrowDown');
    const furniture = toolbar.getByRole('button', { name: 'Möbel' });
    await expect(furniture).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(furniture).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('End');
    await expect(toolbar.getByRole('button', { name: 'Wiederholen' })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(toolbar.getByRole('button', { name: 'Auswählen' })).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(toolbar.getByRole('button', { name: 'Wiederholen' })).toBeFocused();
  });

  test('Befehlssuche: Strg+K, Tippen, Enter und Esc, Fokus kehrt zurück', async ({ page }) => {
    const stage = page.getByRole('region', { name: 'Einrichten am PC' });
    const searchButton = stage.getByRole('button', { name: 'Suchen oder Befehl' });
    await searchButton.focus();

    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Befehlssuche' });
    const input = dialog.getByRole('combobox');
    await expect(input).toBeFocused();

    await input.pressSequentially('abendlicht');
    const option = dialog.getByRole('option', { name: /Abendlicht zeigen/ });
    await expect(option).toHaveAttribute('aria-selected', 'true');
    await expect(input).toHaveAttribute(
      'aria-activedescendant',
      (await option.getAttribute('id')) ?? '',
    );
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(searchButton).toBeFocused();
    await expect(stage.getByRole('slider', { name: 'Tageszeit' })).toHaveAttribute(
      'aria-valuetext',
      '21:30 Uhr',
    );

    await page.keyboard.press('Control+k');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('');
    const first = dialog.getByRole('option').first();
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(first).toHaveAttribute('aria-selected', 'false');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(searchButton).toBeFocused();
  });

  test('Befehlssuche: Umlaute ohne Sonderzeichen und leere Treffer', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Befehlssuche' });
    const input = dialog.getByRole('combobox');
    await input.fill('bucherregal');
    await expect(dialog.getByRole('option')).toHaveText([/Bücherregal/]);
    await input.fill('xyz');
    await expect(dialog.getByRole('option')).toHaveCount(0);
    await expect(dialog.getByText('Nichts gefunden für „xyz“.', { exact: false })).toBeVisible();
    await expect(dialog.getByRole('status')).toHaveText('0 Ergebnisse');
  });

  test('Tageszeit-Regler: Pfeiltasten ändern die Uhrzeit hörbar', async ({ page }) => {
    const slider = page
      .getByRole('region', { name: 'Einrichten am PC' })
      .getByRole('slider', { name: 'Tageszeit' });
    await slider.focus();
    await expect(slider).toHaveAttribute('aria-valuetext', '7:30 Uhr');
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuetext', '7:45 Uhr');
    // Beide Bühnen teilen sich die Uhrzeit
    await expect(
      page.getByRole('region', { name: 'Einrichten auf dem Handy' }).getByRole('slider'),
    ).toHaveAttribute('aria-valuetext', '7:45 Uhr');
  });

  test('Farbfelder: Pfeiltasten wählen die Farbe, die Legende nennt sie', async ({ page }) => {
    const stage = page.getByRole('region', { name: 'Einrichten am PC' });
    const group = stage.getByRole('group', { name: /Bezug/ });
    await expect(group).toHaveAccessibleName(/Sand/);
    await group.getByRole('radio', { name: 'Sand' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: 'Moos' })).toBeChecked();
    await expect(group.getByRole('radio', { name: 'Moos' })).toBeFocused();
    await expect(group).toHaveAccessibleName(/Moos/);
  });

  test('Zahlenfeld: verständliche Meldung erst beim Verlassen, dann wieder weg', async ({
    page,
  }) => {
    const field = page.getByRole('textbox', { name: 'Raumhöhe in cm' });
    await field.fill('abc');
    await expect(field).not.toHaveAttribute('aria-invalid', 'true');
    await page.keyboard.press('Tab');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription('Gib eine Zahl ein, zum Beispiel 250.');

    // Steht schon eine Meldung da, folgt sie der Eingabe sofort und verschwindet bei gültiger Zahl
    await field.fill('2,6');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription('Gib mindestens 180 cm ein.');
    await field.fill('260');
    await expect(field).not.toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription('');

    // Aus gültigem Zustand heraus meldet sich das Feld wieder erst beim Verlassen
    await field.fill('2,6');
    await expect(field).not.toHaveAttribute('aria-invalid', 'true');
    await page.keyboard.press('Tab');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription('Gib mindestens 180 cm ein.');
  });
});

test.describe('Tastatur auf dem Handy', () => {
  test('Griff der Handy-Karte: Enter klappt auf, Esc klappt ein', async ({ page }, testInfo) => {
    test.skip(!isPhoneProject(testInfo.project.name), 'Die Handy-Karte gibt es nur auf dem Handy.');
    await openShowcase(page, true);
    const stage = page.getByRole('region', { name: 'Einrichten auf dem Handy' });
    const handle = stage.getByRole('button', { name: 'Alle Eigenschaften zeigen' });
    await expect(handle).toHaveAttribute('aria-expanded', 'false');
    // Eingeklappt ist der Körper der Karte `inert`, die Felder sind nicht erreichbar. Playwrights
    // getByRole blendet `inert` nicht aus, darum wird geprüft, dass das Feld keinen Fokus annimmt.
    const width = stage.getByRole('textbox', { name: 'Breite in cm' });
    await width.evaluate((element) => {
      element.focus();
    });
    await expect(width).not.toBeFocused();

    await handle.focus();
    await page.keyboard.press('Enter');
    const collapse = stage.getByRole('button', { name: 'Eigenschaften einklappen' });
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await width.focus();
    await expect(width).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(handle).toHaveAttribute('aria-expanded', 'false');
    await expect(handle).toBeFocused();
  });
});
