import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { Header } from './components/Header';
import { Pagination } from './components/Pagination';
import { ROUTES } from '@data/testData';

/**
 * The FAQs page — `/rebranding-support-and-help/rebranding-faqs`.
 *
 * Two filters sit above the list: a free-text search (`sakani-wc-input`, marked
 * `clearable`) and a category combobox. Each grows a red `aria-label="Clear"`
 * button once it holds a value — that pair of buttons is what the manual case
 * calls "reset"; there is no separate reset control.
 *
 * Questions are accordions: `button#accordion-v6-header-N[aria-expanded]`
 * controlling `#accordion-v6-panel-N`.
 */
export class FaqsPage extends BasePage {
  protected readonly path = ROUTES.faqs;

  readonly header: Header;
  readonly pagination: Pagination;

  readonly title: Locator;
  readonly searchInput: Locator;
  readonly categorySelect: Locator;
  readonly categoryTrigger: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new Header(page);
    this.pagination = new Pagination(page);

    this.title = page.getByText('الأسئلة الشائعة', { exact: true }).first();
    this.searchInput = page.getByRole('textbox', { name: 'بحث' }).first();
    this.categorySelect = page.locator('input[role="combobox"]').first();
    this.categoryTrigger = page.getByText('اختر الفئة', { exact: true }).first();
  }

  async open(): Promise<void> {
    await this.gotoUntilReady(this.searchInput);
    await this.hydrate();
  }

  /** Every question header currently rendered. */
  questions(): Locator {
    return this.page.locator('button[id^="accordion-v6-header-"]');
  }

  question(text: string | RegExp): Locator {
    return this.questions().filter({ hasText: text }).first();
  }

  async questionCount(): Promise<number> {
    return this.questions().count();
  }

  async questionTexts(): Promise<string[]> {
    return (await this.questions().allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }

  /**
   * Clear ("reset") controls, in DOM order.
   *
   * They only exist while their field holds a value, which is exactly what the
   * reset assertion needs to observe.
   *
   * The two filters are built from different component libraries and expose
   * different controls: the search field renders `sakani-wc-input`'s
   * `<button aria-label="Clear">`, while the category filter renders ng-select's
   * `<span class="ng-clear-wrapper">`, which is neither a button nor labelled.
   * That inconsistency is reported as an accessibility finding; the locator has
   * to cover both for the reset journey to be automatable at all.
   */
  clearButtons(): Locator {
    return this.page.locator('button[aria-label="Clear"], .ng-clear-wrapper');
  }

  /** Clear control belonging to the free-text search field. */
  searchClearButton(): Locator {
    return this.page.getByRole('button', { name: 'Clear' }).first();
  }

  /** Clear control belonging to the category filter. */
  categoryClearButton(): Locator {
    return this.page.locator('.ng-clear-wrapper').first();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.waitForListToSettle();
  }

  async selectCategory(name: string): Promise<void> {
    await this.categorySelect.click();
    await this.page.getByRole('option', { name, exact: true }).first().click();
    await this.waitForListToSettle();
  }

  async categoryOptions(): Promise<string[]> {
    await this.categorySelect.click();
    await expect(this.page.getByRole('option').first()).toBeVisible();
    const options = (await this.page.getByRole('option').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    await this.page.keyboard.press('Escape');
    return options;
  }

  /** Clear every active filter through the UI's own clear controls. */
  async resetFilters(): Promise<void> {
    // Re-resolve each time: clearing one field re-renders the row and detaches
    // the remaining handles.
    while ((await this.clearButtons().count()) > 0) {
      await this.clearButtons().first().click();
      await this.waitForListToSettle();
    }
  }

  async expandQuestion(text: string | RegExp): Promise<void> {
    const header = this.question(text);
    await header.scrollIntoViewIfNeeded();
    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'true');
  }

  async collapseQuestion(text: string | RegExp): Promise<void> {
    const header = this.question(text);
    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'false');
  }

  /** The answer panel a question header controls. */
  async answerPanel(text: string | RegExp): Promise<Locator> {
    const id = await this.question(text).getAttribute('aria-controls');
    return this.page.locator(`#${id}`);
  }

  /**
   * Wait for the filtered list to settle.
   *
   * Filtering is debounced and re-renders the accordions, so polling the
   * rendered question set is more reliable than waiting on any single element.
   */
  private async waitForListToSettle(): Promise<void> {
    let previous = -1;
    await expect
      .poll(
        async () => {
          const current = await this.questions().count();
          const settled = current === previous;
          previous = current;
          return settled;
        },
        { timeout: 45_000, intervals: [1000, 1000, 1500] },
      )
      .toBe(true);
  }
}
