import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures.ts';

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`Barrierefreiheit (${colorScheme === 'light' ? 'hell' : 'dunkel'})`, () => {
    test.use({ colorScheme });

    test('die Startseite hat keine Verstöße gegen WCAG 2.2 AA', async ({ page }) => {
      await page.goto('./');
      await expect(page.getByRole('heading', { level: 1, name: 'Wandelbar' })).toBeVisible();

      const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
