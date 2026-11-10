import { Page, Locator, expect } from '@playwright/test';
import { scrollThroughPage } from '@helpers/hydrate';
import { LANG } from '@data/testData';

/**
 * How long to wait for a page's first meaningful element after navigation.
 *
 * The rebranded pages return their document quickly but paint only once the
 * `skn-*` / `sakani-wc-*` web components upgrade, which is gated on a large
 * bundle. 90s covers a cold edge without masking a genuine hang.
 */
export const PAGE_READY_TIMEOUT = 90_000;

/**
 * Shared behaviour for every page object. Concrete pages extend it and expose
 * their own locators and actions.
 */
export abstract class BasePage {
  readonly page: Page;

  /** Path relative to `baseURL`, overridden by each page. */
  protected readonly path: string = '/';

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Build the URL for a path in the configured language.
   *
   * English is served from an `/en` prefix. Navigating there directly is not
   * enough on its own — the server honours the stored `localStorage.language`
   * preference — so the fixture seeds that key as well.
   */
  protected localised(url: string = this.path): string {
    if (LANG === 'en' && !url.startsWith('/en/')) return `/en${url}`;
    return url;
  }

  /**
   * Navigate, retrying once on a navigation timeout.
   *
   * Beta intermittently fails to return the document inside the configured
   * navigation budget — a cold CMS edge, not an application defect. Retrying
   * the navigation keeps that environment noise out of the test results without
   * touching any assertion; a second failure is still reported.
   */
  async goto(url: string = this.path): Promise<void> {
    const target = this.localised(url);
    try {
      await this.page.goto(target, { waitUntil: 'domcontentloaded' });
    } catch (error) {
      if (!(error instanceof Error) || !/Timeout|timeout/.test(error.message)) throw error;
      await this.page.goto(target, { waitUntil: 'domcontentloaded' });
    }
  }

  /**
   * Navigate, then block until `ready` is visible.
   *
   * Reloads once if the web components fail to upgrade on the first attempt,
   * which beta does intermittently under slow bundle delivery.
   */
  protected async gotoUntilReady(ready: Locator, url: string = this.path): Promise<void> {
    await this.goto(url);
    try {
      await expect(ready).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
    } catch {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await expect(ready).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
    }
  }

  /**
   * Walk the page top-to-bottom so every lazily-hydrated section exists.
   *
   * See `scrollThroughPage`; the `Pagination` component shares it, because a
   * listing that arrives after the page was hydrated leaves its paginator
   * unrendered until something scrolls past it again.
   */
  async hydrate(): Promise<void> {
    await scrollThroughPage(this.page);
  }

  /**
   * Click a control by its visible text.
   *
   * Many rebranded controls are `<div role="button">` or `<button>` whose text
   * sits in a nested `<span>`; Playwright's accessible-name computation returns
   * an empty name for a number of them (the Nafath "Continue" and the cookie
   * "Accept" buttons among others), so `getByRole(..., { name })` silently
   * resolves to zero elements. Filtering on text is the strategy proven to
   * resolve against this application.
   */
  protected byText(text: string | RegExp, selector = 'button, [role="button"], a'): Locator {
    const pattern = typeof text === 'string' ? new RegExp(`^\\s*${escapeRegExp(text)}\\s*$`) : text;
    return this.page.locator(selector).filter({ hasText: pattern });
  }

  async expectUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }

  currentUrl(): string {
    return this.page.url();
  }
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
