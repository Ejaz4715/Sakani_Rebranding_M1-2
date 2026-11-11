import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { Header } from './components/Header';
import { Pagination } from './components/Pagination';
import { SortPanel } from './components/SortPanel';
import { REPORT_CARD, ROUTES } from '@data/testData';

/**
 * The reports listing — `/reports`.
 *
 * Three category tabs (Sakani reports / residential outreach / programme book)
 * switch the listing; a sort panel and a paginator sit above it.
 *
 * Each card offers either a preview link to a published PDF or a disabled
 * "قريباً" button. The preview control is labelled with the untranslated key
 * `report_preview` — kept in test data as an observed value, and reported as a
 * defect rather than normalised away.
 */
export class ReportsPage extends BasePage {
  protected readonly path = ROUTES.reports;

  readonly header: Header;
  readonly pagination: Pagination;
  readonly sort: SortPanel;

  readonly title: Locator;
  readonly listingHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new Header(page);
    this.pagination = new Pagination(page);
    this.sort = new SortPanel(page);

    this.title = page.getByRole('heading', { name: 'تقارير سكني', exact: true }).first();
    this.listingHeading = page.getByRole('heading', { name: 'جميع التقارير', exact: true }).first();
  }

  async open(): Promise<void> {
    await this.gotoUntilReady(this.listingHeading);
    await this.hydrate();
  }

  tab(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true }).first();
  }

  async openTab(name: string): Promise<void> {
    await this.tab(name).click();
    await this.waitForListingToSettle();
  }

  /**
   * Preview links for reports whose file is published.
   *
   * Located by what the control is — a download link to a PDF — and not by its
   * label. The label is exactly what SAKANI-46375-06 judges (it used to be the
   * raw key `report_preview`, DEF-05), so the locator must not depend on it:
   * matching on the key would find nothing once the label is translated, and
   * matching on the translation would hide the defect if it came back.
   */
  previewLinks(): Locator {
    return this.page.locator('a[download][href*=".pdf"]').filter({ visible: true });
  }

  /** "Coming soon" buttons for reports with no published file. */
  comingSoonButtons(): Locator {
    return this.page.locator('button').filter({ hasText: new RegExp(`^\\s*${REPORT_CARD.comingSoon}\\s*$`) });
  }

  /** Report titles currently listed, in render order. */
  async listedReportTitles(): Promise<string[]> {
    return this.page.evaluate(() =>
      [...document.querySelectorAll('h1,h2,h3,h4,h5,p,span,a')]
        .filter((e) => /تقرير برنامج سكني|كتاب برنامج|التوعية/.test(e.textContent ?? '') && e.getBoundingClientRect().width > 0)
        .map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim())
        .filter((t, i, all) => t.length > 0 && all.indexOf(t) === i),
    );
  }

  async reportCount(): Promise<number> {
    return (await this.previewLinks().count()) + (await this.comingSoonButtons().count());
  }

  /**
   * Wait for the listing to stop changing.
   *
   * Sorting and tab switches re-render the cards asynchronously; polling the
   * rendered set avoids reading the previous result set.
   */
  async waitForListingToSettle(): Promise<void> {
    let previous = '';
    await expect
      .poll(
        async () => {
          const current = (await this.listedReportTitles()).join('|');
          const settled = current === previous && current.length > 0;
          previous = current;
          return settled;
        },
        { timeout: 60_000, intervals: [1000, 1000, 1500] },
      )
      .toBe(true);
  }
}
