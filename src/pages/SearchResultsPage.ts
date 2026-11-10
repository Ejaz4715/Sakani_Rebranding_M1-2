import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES } from '@data/testData';

/**
 * The full search results page — `/app/global-search/search-page`.
 *
 * Reached from "see all results" in the header search overlay, which carries
 * the query in `?search=` and the rebranded theme in `?theme_type=v6`.
 */
export class SearchResultsPage extends BasePage {
  protected readonly path = ROUTES.globalSearchResults;

  readonly results: Locator;

  constructor(page: Page) {
    super(page);
    this.results = page.locator('a[href*="/app/"], [class*="card"]');
  }

  /** The query the page was opened with. */
  searchTerm(): string | null {
    return new URL(this.page.url()).searchParams.get('search');
  }

  async expectLoadedFor(term: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(ROUTES.globalSearchResults.replace(/\//g, '\\/')));
    expect(this.searchTerm()).toBe(term);
    // The results grid renders asynchronously; wait for the page to show
    // something rather than asserting on an empty shell.
    await expect
      .poll(async () => (await this.page.evaluate(() => document.body.innerText.trim().length)) > 200, {
        timeout: 90_000,
        message: 'search results page never rendered any content',
      })
      .toBe(true);
  }
}
