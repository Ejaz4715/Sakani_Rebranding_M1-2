import { test, expect, Products } from '@fixtures/pages.fixture';
import { GLOBAL_SEARCH } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-46230 — Global search.
 *
 * The header magnifier opens an overlay that suggests popular services before a
 * query is typed, then switches to grouped results and offers a hand-off to the
 * full marketplace search page.
 */
test.describe('SAKANI-46230 - Global search', () => {
  test(
    'SAKANI-46230-01 - Check the ability to search for a project/service',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ landingPage, header, globalSearch }) => {
      await landingPage.open();

      await logStep('Step 01: the magnifier opens the search overlay');
      await header.openGlobalSearch();
      await globalSearch.expectOpen();
      await expect(globalSearch.input).toHaveAttribute('placeholder', GLOBAL_SEARCH.placeholder);

      await logStep('Step 02: the overlay suggests popular services before anything is typed');
      // Soft, so the typed search below is still verified: the 2026-11 release
      // shows a prompt here instead of the "most common services" suggestions
      // (flagged for clarification).
      await expect.soft(globalSearch.popularServicesHeading, 'the empty overlay should suggest the most common services').toBeVisible();

      await logStep('Step 03: typing a query returns grouped results');
      await globalSearch.search(GLOBAL_SEARCH.term);
      for (const group of GLOBAL_SEARCH.groups) {
        await expect(globalSearch.resultGroup(group), `result group "${group}"`).toBeVisible();
      }

      await logStep('Step 04: the results actually relate to the query');
      const texts = await globalSearch.resultTexts();
      const matching = texts.filter((text) => text.includes(GLOBAL_SEARCH.term));
      expect(matching.length, `no result mentioned "${GLOBAL_SEARCH.term}"`).toBeGreaterThan(0);
    }
  );

  test(
    'SAKANI-46230-02 - Check the functionality of see all results',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ landingPage, header, globalSearch, searchResultsPage }) => {
      await landingPage.open();
      await header.openGlobalSearch();
      await globalSearch.expectOpen();
      await globalSearch.search(GLOBAL_SEARCH.term);

      await expect(globalSearch.seeAllResults).toBeVisible();
      await globalSearch.openAllResults();

      await searchResultsPage.expectLoadedFor(GLOBAL_SEARCH.term);
    }
  );
});
