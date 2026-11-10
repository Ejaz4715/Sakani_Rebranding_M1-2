import { Page, Locator, expect } from '@playwright/test';
import { scrollThroughPage } from '@helpers/hydrate';

/**
 * The paginator shared by the FAQs, Reports and News listings.
 *
 * It is a `div[role="navigation"][aria-label="Pagination"]` — not a `<nav>`, so
 * a tag-based selector finds nothing — holding a fixed run of buttons:
 *
 *   [ first ] [ ‹ ] [ 1 ] [ 2 ] … [ n ] [ › ] [ last ]
 *
 * The two arrows carry no text, no `aria-label` and no `title`, so they compute
 * an empty accessible name and cannot be addressed by role and name at all.
 * That is reported as an accessibility finding; no case needs them, since the
 * manual "pagination" steps mean the numbered buttons and the two ends.
 *
 * **Everything here is located by position inside that landmark, never by
 * label.** The first and last buttons read "الأولى" / "الاخيرة" when the app's
 * translations have loaded and `COMMON.FIRST` / `COMMON.LAST` when they have
 * not, and beta serves both states — the run of 2026-08-30 rendered Arabic on
 * the news listing and raw keys on reports and FAQs half an hour later, which
 * is what made SAKANI-46375-05 and SAKANI-46872-02 fail on an element that was
 * on the page the whole time. The `aria-label` is not translated, so the
 * landmark is the one stable anchor.
 *
 * `scope` narrows the paginator to a single listing on pages that render more
 * than one; by default the first paginator on the page is used.
 */
export class Pagination {
  private readonly page: Page;

  /** The paginator landmark itself. */
  readonly root: Locator;

  readonly first: Locator;
  readonly last: Locator;

  constructor(page: Page, scope?: Locator) {
    this.page = page;
    const container: Page | Locator = scope ?? page;
    this.root = container.getByRole('navigation', { name: 'Pagination' }).first();
    this.first = this.root.getByRole('button').first();
    this.last = this.root.getByRole('button').last();
  }

  /** A numbered page button, scoped to this paginator. */
  pageButton(number: number | string): Locator {
    return this.root.getByRole('button', { name: String(number), exact: true }).first();
  }

  async isPresent(): Promise<boolean> {
    return this.root.isVisible().catch(() => false);
  }

  /**
   * Wait for the paginator and assert it offers the controls the cases use.
   *
   * The listings sit below the fold and arrive after their page's first
   * meaningful element, so a page hydrated before the listing loaded has never
   * scrolled past the paginator and it is not rendered at all. Scrolling
   * through the page again is what brings it into existence; waiting longer
   * would not.
   */
  async expectRendered(): Promise<void> {
    if (!(await this.isPresent())) await scrollThroughPage(this.page);

    await expect(this.root, 'the listing should render a paginator').toBeVisible();
    await expect(this.first).toBeVisible();
    await expect(this.last).toBeVisible();
    await expect(this.pageButton(1)).toBeVisible();
  }

  /** Every page number currently offered, in render order. */
  async pageNumbers(): Promise<number[]> {
    const labels = await this.root
      .getByRole('button')
      .filter({ hasText: /^\s*\d+\s*$/ })
      .allInnerTexts();
    return labels.map((label) => Number(label.trim())).filter((value) => Number.isFinite(value));
  }

  async goToPage(number: number): Promise<void> {
    await this.pageButton(number).click();
  }

  async goToLast(): Promise<void> {
    await this.last.click();
  }

  async goToFirst(): Promise<void> {
    await this.first.click();
  }
}
