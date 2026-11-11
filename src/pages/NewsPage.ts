import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { Header } from './components/Header';
import { Pagination } from './components/Pagination';
import { NEWS_READ_MORE, NEWS_SORT, ROUTES } from '@data/testData';

/**
 * The news listing — `/news`.
 *
 * Its sort control is a different component from the Reports one: a dropdown of
 * `div[role="button"][data-sort-type]` entries under a "نوع" group, applied on
 * click with no separate Apply/Clear buttons.
 *
 * Each article exposes a "اكتشف المزيد" control that navigates to
 * `/news/<slug>` (`ROUTES.newsArticle`).
 */
export class NewsPage extends BasePage {
  protected readonly path = ROUTES.news;

  readonly header: Header;
  readonly pagination: Pagination;

  readonly title: Locator;
  readonly listingHeading: Locator;
  readonly sortTrigger: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new Header(page);
    this.pagination = new Pagination(page);

    this.title = page.getByText('الأخبار', { exact: true }).first();
    this.listingHeading = page.getByText('جميع الأخبار', { exact: true }).first();
    this.sortTrigger = page.locator('button').filter({ hasText: /ترتيب حسب/ }).first();
  }

  /**
   * The listing — and with it the sort control and paginator — lives in a
   * lazily-hydrated section below the hero carousel, so it does not exist until
   * the page has been scrolled. Readiness is therefore taken from the header,
   * and the listing is only expected after `hydrate()`.
   */
  async open(): Promise<void> {
    await this.gotoUntilReady(this.header.logo);
    await this.hydrate();
    await expect(this.sortTrigger).toBeVisible({ timeout: 60_000 });
  }

  sortOption(label: string): Locator {
    return this.page.getByRole('button', { name: label, exact: true }).first();
  }

  /**
   * Open the sort dropdown, or leave it open if it already is.
   *
   * The dropdown is a CDK overlay: while it is open a transparent
   * `cdk-overlay-backdrop` covers the page and swallows any further click on
   * the trigger. Making this idempotent means a caller can inspect the options
   * and then choose one without having to track the panel's state.
   */
  async openSort(): Promise<void> {
    if (await this.sortOption(NEWS_SORT.newest).isVisible().catch(() => false)) return;
    await this.sortTrigger.click();
    await expect(this.sortOption(NEWS_SORT.newest)).toBeVisible();
  }

  /** Dismiss the dropdown by clicking its own backdrop. */
  async closeSort(): Promise<void> {
    const backdrop = this.page.locator('.cdk-overlay-backdrop').first();
    if (await backdrop.isVisible().catch(() => false)) {
      await backdrop.click();
      await expect(this.sortOption(NEWS_SORT.newest)).toBeHidden();
    }
  }

  async sortBy(label: string): Promise<void> {
    await this.openSort();
    await this.sortOption(label).click();
    await this.waitForListingToSettle();
  }

  /** `data-sort-type` of the option, e.g. `published_date desc`. */
  async sortTypeOf(label: string): Promise<string | null> {
    return this.sortOption(label).getAttribute('data-sort-type');
  }

  readMoreButtons(): Locator {
    return this.page.locator('button, a').filter({ hasText: new RegExp(`^\\s*${NEWS_READ_MORE}\\s*$`) });
  }

  /**
   * Open an article from the listing and return the headline of the card that
   * was activated, so the caller can assert the detail page matches it.
   *
   * The last read-more control is used deliberately: the hero carousel renders
   * its own at the top of the document and rotates on a timer, so the first one
   * is not a stable target.
   */
  async openLastListedArticle(): Promise<string> {
    const button = this.readMoreButtons().last();
    await button.scrollIntoViewIfNeeded();

    const headline = await button.evaluate((element) => {
      const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
      let card: Element = element;
      for (let i = 0; i < 8 && card.parentElement; i++) {
        card = card.parentElement;
        const rect = card.getBoundingClientRect();
        if (rect.height > 120 && rect.width > 300) break;
      }
      return (
        [...card.querySelectorAll('*')]
          .filter((node) => node.children.length === 0)
          .map((node) => clean(node.textContent))
          .filter((text) => text.length > 25)
          .sort((a, b) => b.length - a.length)[0] ?? ''
      );
    });

    await button.click();
    await this.page.waitForURL(ROUTES.newsArticle, { timeout: 90_000 });
    return headline;
  }

  /**
   * The articles in the "all news" listing, as `"<date> :: <headline>"`.
   *
   * The listing renders no heading elements at all — a card is a plain `div`
   * holding a date span, a headline span and the read-more control — so the
   * cards are located structurally, by walking up from each read-more control.
   *
   * Scoped to the listing section on purpose: the hero carousel above it also
   * carries read-more controls and rotates on a timer, which would make any
   * page-wide collection change under its own steam.
   */
  async listedArticles(): Promise<string[]> {
    return this.page.evaluate((readMoreLabel) => {
      const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();

      const listingHeading = [...document.querySelectorAll('*')].find(
        (element) => clean(element.textContent) === 'جميع الأخبار' && element.getBoundingClientRect().width > 0,
      );

      // Climb from the heading until the container also holds the cards.
      let scope: Element = document.body;
      if (listingHeading) {
        let candidate: Element | null = listingHeading;
        while (candidate) {
          const buttons = [...candidate.querySelectorAll('button, a')].filter(
            (element) => clean(element.textContent) === readMoreLabel,
          );
          if (buttons.length >= 2) {
            scope = candidate;
            break;
          }
          candidate = candidate.parentElement;
        }
      }

      const readMore = [...scope.querySelectorAll('button, a')].filter(
        (element) => clean(element.textContent) === readMoreLabel && element.getBoundingClientRect().width > 0,
      );

      return readMore.map((button) => {
        let card: Element = button;
        for (let i = 0; i < 8 && card.parentElement; i++) {
          card = card.parentElement;
          const rect = card.getBoundingClientRect();
          if (rect.height > 120 && rect.width > 300) break;
        }
        const leaves = [...card.querySelectorAll('*')].filter((element) => element.children.length === 0);
        const date = leaves.map((e) => clean(e.textContent)).find((t) => /^[A-Za-z]{3}\s+\d{1,2}\s+\d{4}$/.test(t)) ?? '';
        const headline = leaves
          .map((e) => clean(e.textContent))
          .filter((t) => t.length > 25)
          .sort((a, b) => b.length - a.length)[0] ?? '';
        return `${date} :: ${headline.slice(0, 80)}`;
      });
    }, NEWS_READ_MORE);
  }

  /** Publication dates in the listing, in render order (e.g. "Dec 06 2023"). */
  async listedDates(): Promise<string[]> {
    return (await this.listedArticles()).map((article) => article.split(' :: ')[0]).filter(Boolean);
  }

  async waitForListingToSettle(): Promise<void> {
    let previous = '';
    await expect
      .poll(
        async () => {
          const current = (await this.listedArticles()).join('|');
          const settled = current === previous && current.length > 0;
          previous = current;
          return settled;
        },
        { timeout: 60_000, intervals: [1000, 1000, 1500] },
      )
      .toBe(true);
  }
}
