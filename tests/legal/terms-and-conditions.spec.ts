import { test, expect, Products } from '@fixtures/pages.fixture';
import { ROUTES, TERMS } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-46030 — Terms & conditions page.
 *
 * Reached from the footer, where the link is labelled "سياسة الخصوصية"; the
 * page itself covers both the terms and the privacy policy.
 */
test.describe('SAKANI-46030 - Terms and conditions', () => {
  test(
    'SAKANI-46030-01 - Check the navigation to the page and check all the headings are clickable',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ landingPage, termsPage, page }) => {
      await logStep('Step 01: the footer link reaches the page');
      await landingPage.open();
      await landingPage.hydrate();
      await landingPage.footer.open('terms');
      await expect(page).toHaveURL(new RegExp(`${ROUTES.terms}$`));
      await expect(termsPage.title).toBeVisible({ timeout: 60_000 });

      await termsPage.hydrate();

      await logStep('Step 02: every documented section appears in the side navigation and the body');
      await termsPage.expectHeadingsRendered(TERMS.headings);

      for (const heading of TERMS.headings) {
        await logStep(`Step 03: "${heading}" is clickable and scrolls to its section`);
        await termsPage.openSection(heading);
      }
    }
  );
});
