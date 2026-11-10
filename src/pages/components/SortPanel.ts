import { Page, Locator, expect } from '@playwright/test';
import { REPORT_SORT } from '@data/testData';

/**
 * The "Sort by" panel used by the Reports listing.
 *
 * Options are `div[role="button"]` chips grouped under three labels. Selection
 * is expressed only through styling — a selected chip carries the bare
 * `tw:bg-v6-primary` utility class, an unselected one `tw:bg-v6-primary-25` —
 * with no `aria-pressed`/`aria-selected` to read. That accessibility gap is why
 * `isSelected` has to inspect the class list; it is reported as a finding
 * rather than worked around silently.
 *
 * The trigger button carries a count badge: "ترتيب حسب" alone when nothing is
 * applied, "ترتيب حسب 1" once one option has been applied.
 */
export class SortPanel {
  private readonly page: Page;

  readonly trigger: Locator;
  readonly applyButton: Locator;
  readonly clearAllButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.trigger = page.locator('button').filter({ hasText: /ترتيب حسب/ }).first();
    this.applyButton = page.getByRole('button', { name: REPORT_SORT.apply, exact: true }).first();
    this.clearAllButton = page.getByRole('button', { name: REPORT_SORT.clearAll, exact: true }).first();
  }

  option(label: string): Locator {
    return this.page.getByRole('button', { name: label, exact: true }).first();
  }

  groupLabel(label: string): Locator {
    return this.page.getByText(label, { exact: true }).first();
  }

  async open(): Promise<void> {
    await this.trigger.click();
    await expect(this.applyButton).toBeVisible();
  }

  async close(): Promise<void> {
    if (await this.applyButton.isVisible().catch(() => false)) {
      await this.trigger.click();
    }
  }

  /**
   * True when the chip is styled as selected.
   *
   * Matches the bare `tw:bg-v6-primary` token so it never confuses the
   * unselected `tw:bg-v6-primary-25` or the `tw:hover:bg-v6-primary-50` variant.
   */
  async isSelected(label: string): Promise<boolean> {
    const className = await this.option(label).getAttribute('class');
    return /(^|\s)tw:bg-v6-primary(\s|$)/.test(className ?? '');
  }

  /** Every option currently styled as selected. */
  async selectedOptions(): Promise<string[]> {
    const selected: string[] = [];
    for (const label of REPORT_SORT.allOptions) {
      if (await this.isSelected(label)) selected.push(label);
    }
    return selected;
  }

  /**
   * Choose an option, and wait for the chip to reflect it.
   *
   * Selection is styling only and it lands a beat after the click, so reading
   * it straight back can still see the previous state — which is how
   * SAKANI-46375-04 came to report every option as unselected immediately
   * after clicking one.
   */
  async select(label: string): Promise<void> {
    await this.option(label).click();
    await expect
      .poll(async () => this.isSelected(label), {
        message: `"${label}" should be styled as selected once clicked`,
        timeout: 15_000,
      })
      .toBe(true);
  }

  async apply(): Promise<void> {
    await this.applyButton.click();
  }

  async clearAll(): Promise<void> {
    await this.clearAllButton.click();
  }

  /** Number shown on the trigger badge, or 0 when no sort is applied. */
  async appliedCount(): Promise<number> {
    const label = (await this.trigger.innerText()).replace(/\s+/g, ' ').trim();
    const match = label.match(/(\d+)\s*$/);
    return match ? Number(match[1]) : 0;
  }
}
