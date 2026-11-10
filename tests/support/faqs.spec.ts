import { test, expect, Products } from '@fixtures/pages.fixture';
import { FAQ } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-46872 — FAQs page.
 *
 * "Reset" in the manual case is the red clear (✕) control each filter grows
 * once it holds a value; the page has no separate reset button.
 */
test.describe('SAKANI-46872 - FAQs', () => {
  test('SAKANI-46872-01 - Check functionality of search/category and reset', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ faqsPage }) => {
    await faqsPage.open();

    const initialQuestions = await faqsPage.questionTexts();
    expect(initialQuestions.length).toBeGreaterThan(0);

    await logStep('Step 01: free-text search narrows the list to matching questions');
    await faqsPage.search(FAQ.searchTerm);
    const filtered = await faqsPage.questionTexts();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered).not.toEqual(initialQuestions);
    await expect(faqsPage.searchInput).toHaveValue(FAQ.searchTerm);

    await logStep('Step 02: a clear control appears for the active search filter');
    await expect(faqsPage.searchClearButton()).toBeVisible();

    await logStep('Step 03: the category filter narrows the list further');
    const beforeCategory = await faqsPage.questionTexts();
    await faqsPage.selectCategory(FAQ.category);
    const afterCategory = await faqsPage.questionTexts();
    expect(afterCategory.length).toBeLessThanOrEqual(beforeCategory.length);
    await expect(faqsPage.categoryClearButton()).toBeVisible();
    expect(await faqsPage.clearButtons().count()).toBeGreaterThanOrEqual(2);

    await logStep('Step 04: reset clears every filter and restores the full list');
    await faqsPage.resetFilters();
    await expect(faqsPage.searchInput).toHaveValue('');
    await expect(faqsPage.clearButtons()).toHaveCount(0);
    expect(await faqsPage.questionTexts()).toEqual(initialQuestions);
  });

  test('SAKANI-46872-02 - Check the pagination', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ faqsPage }) => {
    await faqsPage.open();
    await faqsPage.pagination.expectRendered();

    const firstPageQuestions = await faqsPage.questionTexts();
    const pageNumbers = await faqsPage.pagination.pageNumbers();
    expect(pageNumbers.length).toBeGreaterThan(1);

    await logStep('Step 01: moving to page 2 loads a different set of questions');
    await faqsPage.pagination.goToPage(2);
    await expect.poll(async () => (await faqsPage.questionTexts()).join('|'), { timeout: 45_000 }).not.toBe(firstPageQuestions.join('|'));

    await logStep('Step 02: "last" jumps to the final page');
    await faqsPage.pagination.goToLast();
    await expect(faqsPage.pagination.pageButton(pageNumbers[pageNumbers.length - 1])).toBeVisible();
    expect((await faqsPage.questionTexts()).length).toBeGreaterThan(0);

    await logStep('Step 03: "first" returns to the original page');
    await faqsPage.pagination.goToFirst();
    await expect.poll(async () => (await faqsPage.questionTexts()).join('|'), { timeout: 45_000 }).toBe(firstPageQuestions.join('|'));
  });

  test('SAKANI-46872-03 - Check the details expansion arrow functionality', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ faqsPage }) => {
    await faqsPage.open();

    const header = faqsPage.question(FAQ.firstQuestion);
    await expect(header).toBeVisible();
    await expect(header).toHaveAttribute('aria-expanded', 'false');

    const panel = await faqsPage.answerPanel(FAQ.firstQuestion);
    await expect(panel).toBeHidden();

    await logStep('Step 01: the arrow expands the question and reveals its answer');
    await faqsPage.expandQuestion(FAQ.firstQuestion);
    await expect(panel).toBeVisible();
    expect((await panel.innerText()).trim().length).toBeGreaterThan(0);

    await logStep('Step 02: the arrow collapses it again');
    await faqsPage.collapseQuestion(FAQ.firstQuestion);
    await expect(panel).toBeHidden();
  });
});
