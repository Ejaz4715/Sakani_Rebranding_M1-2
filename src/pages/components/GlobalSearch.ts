import { Page, Locator, expect } from '@playwright/test';
import { GLOBAL_SEARCH, ROUTES } from '@data/testData';

/**
 * The global search overlay opened from the header magnifier.
 *
 * Before a query is typed it shows recent searches and "most common services";
 * typing switches it to grouped results (properties, developers/brokers) with a
 * "see all results" control that hands off to the marketplace search page.
 */
export class GlobalSearch {
  private readonly page: Page;

  readonly input: Locator;
  readonly popularServicesHeading: Locator;
  readonly seeAllResults: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // The overlay's own box is the only field carrying this placeholder; the
    // landing hero's city field uses a different one.
    this.input = page.getByPlaceholder(GLOBAL_SEARCH.placeholder).first();
    this.popularServicesHeading = page.getByText(GLOBAL_SEARCH.popularServicesHeading, { exact: true }).first();
    this.seeAllResults = page.locator('button, a').filter({ hasText: GLOBAL_SEARCH.seeAllLabel }).first();
    // The overlay's dismiss control, labelled in English like the magnifier.
    // Scoped to what is on screen: the footer's newsletter toasts keep two more
    // `aria-label="Close"` buttons in the page while hidden.
    this.closeButton = page.locator('button[aria-label="Close"]:visible').first();
  }

  /**
   * The overlay block that contains the search box.
   *
   * `locator('div').filter({ has: input })` is not usable here — it resolves to
   * the input's own wrapper, which holds no results. The overlay has no stable
   * id or role, so the panel is found by walking up from the input until the
   * ancestor is tall enough to be the overlay itself.
   */
  private async panelText(): Promise<string> {
    return this.page.evaluate((placeholder) => {
      const input = document.querySelector(`input[placeholder="${placeholder}"]`);
      if (!input) return '';
      let node: Element = input;
      while (node.parentElement && node.getBoundingClientRect().height < 300) node = node.parentElement;
      return (node as HTMLElement).innerText ?? '';
    }, GLOBAL_SEARCH.placeholder);
  }

  async expectOpen(): Promise<void> {
    await expect(this.input).toBeVisible();
  }

  /** Dismiss the overlay with its own close control. */
  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.input).toBeHidden({ timeout: 30_000 });
  }

  async search(term: string): Promise<void> {
    await this.input.fill(term);
    // Results arrive from a debounced query; wait for a group heading rather
    // than a fixed delay.
    await expect(this.resultGroup(GLOBAL_SEARCH.groups[0])).toBeVisible({ timeout: 45_000 });
  }

  resultGroup(name: string): Locator {
    return this.page.getByText(name, { exact: true }).first();
  }

  /** Lines of text currently rendered inside the overlay. */
  async resultTexts(): Promise<string[]> {
    const text = await this.panelText();
    return text.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  async openAllResults(): Promise<void> {
    await this.seeAllResults.click();
    await this.page.waitForURL(new RegExp(ROUTES.globalSearchResults.replace(/\//g, '\\/')));
  }
}
