import { test, expect, Products } from '@fixtures/pages.fixture';
import { NEWS_SORT, ROUTES } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-46231 — News page.
 *
 * The news sort is a different component from the reports one: a dropdown of
 * `data-sort-type` entries applied on click, with no Apply/Clear buttons.
 */
test.describe('SAKANI-46231 - News', () => {
  test('SAKANI-46231-01 - Check the functionality of sort', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ newsPage }) => {
    await newsPage.open();

    const initial = await newsPage.listedArticles();
    expect(initial.length).toBeGreaterThan(1);

    await logStep('Step 01: the sort dropdown offers newest and oldest first');
    await newsPage.openSort();
    await expect(newsPage.sortOption(NEWS_SORT.newest)).toBeVisible();
    await expect(newsPage.sortOption(NEWS_SORT.oldest)).toBeVisible();
    expect(await newsPage.sortTypeOf(NEWS_SORT.newest)).toBe('published_date desc');
    expect(await newsPage.sortTypeOf(NEWS_SORT.oldest)).toBe('published_date asc');

    await logStep('Step 02: sorting oldest first puts the earliest article at the top');
    await newsPage.sortBy(NEWS_SORT.oldest);
    const oldestFirst = await newsPage.listedArticles();
    expect(oldestFirst.length).toBeGreaterThan(0);

    const oldestDates = (await newsPage.listedDates()).map((date) => Date.parse(date)).filter(Number.isFinite);
    expect(oldestDates.length).toBeGreaterThan(1);
    expect(oldestDates, 'dates should ascend when sorting oldest first').toEqual([...oldestDates].sort((a, b) => a - b));

    await logStep('Step 03: sorting newest first reverses that order');
    await newsPage.sortBy(NEWS_SORT.newest);
    const newestDates = (await newsPage.listedDates()).map((date) => Date.parse(date)).filter(Number.isFinite);
    expect(newestDates.length).toBeGreaterThan(1);
    expect(newestDates, 'dates should descend when sorting newest first').toEqual([...newestDates].sort((a, b) => b - a));
  });

  test('SAKANI-46231-02 - Check the functionality of read more button', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ newsPage, page }) => {
    await newsPage.open();

    const buttons = newsPage.readMoreButtons();
    expect(await buttons.count()).toBeGreaterThan(0);

    const headline = await newsPage.openLastListedArticle();
    expect(headline.length, 'the activated card should carry a headline').toBeGreaterThan(25);

    await logStep('Step 01: the article detail page opens');
    await expect(page).toHaveURL(ROUTES.newsArticle);
    const initialDetailText = await page.locator('body').innerText();
    expect(initialDetailText.trim().length).toBeGreaterThan(200);

    await logStep('Step 02: the detail page shows the article that was opened');
    const normalizedDetailText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(normalizedDetailText.includes(headline.slice(0, 30)), `the detail page should show "${headline.slice(0, 40)}…"`).toBe(true);
  });

  test('SAKANI-46231-03 - Check pagination', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ newsPage }) => {
    await newsPage.open();
    await newsPage.pagination.expectRendered();

    const firstPage = await newsPage.listedArticles();
    const pageNumbers = await newsPage.pagination.pageNumbers();
    expect(pageNumbers.length).toBeGreaterThan(1);

    await logStep('Step 01: page 2 lists different articles');
    await newsPage.pagination.goToPage(2);
    await expect.poll(async () => (await newsPage.listedArticles()).join('|'), { timeout: 45_000 }).not.toBe(firstPage.join('|'));

    await logStep('Step 02: "last" and "first" move to the ends of the listing');
    await newsPage.pagination.goToLast();
    expect((await newsPage.listedArticles()).length).toBeGreaterThan(0);

    await newsPage.pagination.goToFirst();
    await expect.poll(async () => (await newsPage.listedArticles()).join('|'), { timeout: 45_000 }).toBe(firstPage.join('|'));
  });

  test('SAKANI-46231-04 - The news page is reachable from the footer', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ landingPage, newsPage, page }) => {
    await landingPage.open();
    await landingPage.hydrate();
    await landingPage.footer.open('news');

    await expect(page).toHaveURL(new RegExp(`${ROUTES.news}$`));
    await expect(newsPage.sortTrigger).toBeVisible({ timeout: 60_000 });
  });
});
