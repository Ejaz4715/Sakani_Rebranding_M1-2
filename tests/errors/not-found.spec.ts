import { test, expect, Products } from '@fixtures/pages.fixture';
import { ROUTES, UNKNOWN_ROUTE } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-46035 — Error & maintenance pages.
 *
 * Beta serves two different not-found pages, which is the substance of this
 * story: the dedicated `/rebranding-page-not-found` carries the rebranded
 * design, while a genuinely unknown URL falls back to the pre-rebranding
 * template.
 */
test.describe('SAKANI-46035 - Error pages', () => {
  test('SAKANI-46035-01 - The rebranded 404 page renders its content', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ notFoundPage, page }) => {
    await notFoundPage.openRebranded();

    await expect(page).toHaveURL(new RegExp(`${ROUTES.notFound}$`));
    await expect(notFoundPage.rebrandedCode).toBeVisible();
    await expect(notFoundPage.rebrandedHomeButton).toBeVisible();
    await expect(notFoundPage.rebrandedMarketplaceButton).toBeVisible();

    await logStep('Step 01: both recovery links point somewhere useful');
    await expect(notFoundPage.rebrandedHomeButton).toHaveAttribute('href', /sakani\.sa/);
    await expect(notFoundPage.rebrandedMarketplaceButton).toHaveAttribute('href', /marketplace/);
  });

  test(
    'SAKANI-46035-02 - Check the navigation to wrong URL lands to 404 not found page',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ notFoundPage, page }) => {
      await notFoundPage.openUnknown(UNKNOWN_ROUTE);

      await logStep('Step 01: an unknown URL produces a not-found page');
      const variant = await notFoundPage.expectNotFoundShown();
      expect(['rebranded', 'legacy']).toContain(variant);

      await logStep('Step 02: the not-found page offers a way back');
      const homeButton = (await notFoundPage.isRebranded()) ? notFoundPage.rebrandedHomeButton : notFoundPage.legacyHomeButton;
      await expect(homeButton).toBeVisible();

      /**
       * The manual case points at the rebranded 404 as the expected destination.
       * Beta renders the legacy template for unknown URLs instead, and does not
       * redirect to `/rebranding-page-not-found`. The assertion states the
       * intended behaviour; expected to fail while the defect is open (DEF-07).
       */
      await logStep('Step 03: an unknown URL should present the rebranded 404');
      expect(
        await notFoundPage.isRebranded(),
        `an unknown URL (${UNKNOWN_ROUTE}) should render the rebranded 404 seen at ${ROUTES.notFound}; ` +
          'beta falls back to the pre-rebranding template and leaves the URL unchanged ' +
          `(currently ${page.url()}) (DEF-07)`
      ).toBe(true);
    }
  );
});
