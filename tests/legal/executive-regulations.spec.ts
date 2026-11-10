import { test, expect, Products } from '@fixtures/pages.fixture';
import { EXECUTIVE_REGULATIONS, ROUTES } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-46031 — Executive regulations page.
 */
test.describe('SAKANI-46031 - Executive regulations', () => {
  test(
    'SAKANI-46031-01 - Check the navigation to the page and check all the headings are clickable',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ landingPage, regulationsPage, page }) => {
      await logStep('Step 01: the footer link reaches the page');
      await landingPage.open();
      await landingPage.hydrate();
      await landingPage.footer.open('executiveRegulations');
      await expect(page).toHaveURL(new RegExp(`${ROUTES.executiveRegulations}$`));
      await expect(regulationsPage.title).toBeVisible({ timeout: 60_000 });

      await regulationsPage.hydrate();

      await logStep('Step 02: every documented section appears in the side navigation and the body');
      await regulationsPage.expectHeadingsRendered(EXECUTIVE_REGULATIONS.headings);

      for (const heading of EXECUTIVE_REGULATIONS.headings) {
        await logStep(`Step 03: "${heading}" is clickable and scrolls to its section`);
        await regulationsPage.openSection(heading);
      }
    }
  );
});
