import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { collapseCard, collectErrors, goToStep, openApp, openCard, room, tools } from './app.ts';

/**
 * Raumname in Bauen (D-034): Umbenennen ist ein einziger Rückgängig-Schritt, und der Name ist ein
 * Pflichtfeld, das nie leer übernommen wird.
 */

const REQUIRED = 'Pflichtfeld: Gib dem Raum einen Namen.';

/** Die Karte des Raums mit genau diesem Namen */
const card = (page: Page, name: string) => page.getByRole('region', { name, exact: true });

/**
 * Das Namensfeld; auf der Seite gesucht, nicht in der Karte, denn die Karte heißt nach dem
 * Umbenennen anders
 */
const nameField = (page: Page) => page.getByRole('textbox', { name: 'Name', exact: true });

/** Bauen in der Beispielwohnung, Karte des Arbeitszimmers offen */
async function openWorkRoom(page: Page) {
  await openApp(page);
  await goToStep(page, 'Bauen');
  await room(page, 'work').click();
  await openCard(page, 'Arbeitszimmer');
}

test('Raum umbenennen: Ein Rückgängig nimmt den ganzen neuen Namen zurück', async ({ page }) => {
  const errors = collectErrors(page);
  await openWorkRoom(page);
  const undo = tools(page).getByRole('button', { name: 'Rückgängig' });
  const redo = tools(page).getByRole('button', { name: 'Wiederholen' });
  await expect(undo).toBeDisabled();

  // Zeichen für Zeichen tippen, wie ein Mensch; jede Taste gilt sofort
  const name = nameField(page);
  await name.selectText();
  await name.pressSequentially('Büro');
  await expect(card(page, 'Büro')).toBeVisible();

  await collapseCard(page);
  await undo.click();
  await expect(card(page, 'Arbeitszimmer')).toBeVisible();
  await expect(undo).toBeDisabled();
  await redo.click();
  await expect(card(page, 'Büro')).toBeVisible();
  await expect(redo).toBeDisabled();
  expect(errors).toEqual([]);
});

test('Leerer Raumname: Meldung beim Verlassen, die Karte behält den alten Namen', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await openWorkRoom(page);
  const name = nameField(page);
  const message = page.getByText(REQUIRED);
  await expect(name).toHaveAttribute('aria-required', 'true');

  // Leeren: Das Feld bleibt leer, der Raum heißt weiter wie vorher; die Meldung wartet
  await name.fill('');
  await expect(name).toHaveValue('');
  await expect(card(page, 'Arbeitszimmer')).toBeVisible();
  await expect(message).toBeHidden();

  // Verlassen: Meldung unter dem Feld, Feld als ungültig markiert, nichts im Verlauf
  await name.press('Tab');
  await expect(message).toBeVisible();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription(REQUIRED);
  await expect(name).toHaveValue('');
  await expect(card(page, 'Arbeitszimmer')).toBeVisible();
  await expect(tools(page).getByRole('button', { name: 'Rückgängig' })).toBeDisabled();

  // Das erste Zeichen nimmt die Meldung weg und gilt als neuer Name
  await name.press('B');
  await expect(message).toBeHidden();
  await expect(name).not.toHaveAttribute('aria-invalid', 'true');
  await expect(card(page, 'B')).toBeVisible();
  expect(errors).toEqual([]);
});
