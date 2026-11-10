import { Page, Locator, expect } from '@playwright/test';
import { NEWSLETTER } from '@data/testData';

/**
 * The newsletter subscription block, published in the landing page's footer.
 *
 * It lives inside `<footer>`, so `BasePage.hydrate()` has to have run before
 * any of these locators resolve. Note that it is *not* on every rebranded page:
 * the catalogue, the service templates and the reports listing render the same
 * footer without it (SAKANI-42321 TC-08 / DEF-13).
 *
 * Three things shape the assertions built on it:
 *
 *  - the address field is `type="text"`, not `type="email"`, so the browser
 *    contributes no validation of its own; the application validates on submit
 *    and renders "عنوان البريد الإلكتروني بتنسيق غير صالح" beneath the field.
 *  - a successful subscription raises the toast "تم الاشتراك في النشرة
 *    الإخبارية بنجاح" and empties the field. (An earlier note here said there
 *    was no confirmation message; `exploration/output/newsletter-network.json`
 *    captured the toast, so the note was wrong and is corrected.)
 *  - what does *not* happen is a request to a Sakani endpoint: the address only
 *    ever reaches `/analyticCollector/collect`, so nothing can store it or
 *    dispatch to it — see the newsletter spec and DEF-12.
 */
export class Newsletter {
  private readonly page: Page;

  readonly root: Locator;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly subscribeButton: Locator;
  /** The confirmation raised on a successful subscription. */
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('footer').first();
    this.heading = page.getByText(NEWSLETTER.heading, { exact: true }).first();
    this.emailInput = page.getByPlaceholder(NEWSLETTER.placeholder).first();
    this.subscribeButton = page
      .locator('button')
      .filter({ hasText: new RegExp(`^\\s*${NEWSLETTER.submit}\\s*$`) })
      .first();
    this.successToast = page.getByText(NEWSLETTER.successMessage).first();
  }

  async expectRendered(): Promise<void> {
    await this.heading.scrollIntoViewIfNeeded();
    await expect(this.heading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.subscribeButton).toBeVisible();
    await expect(this.subscribeButton).toBeEnabled();
  }

  /** True when the capture sits in the global footer rather than the page body. */
  async isInFooter(): Promise<boolean> {
    return this.emailInput.evaluate((input) => !!input.closest('footer'));
  }

  async enter(email: string): Promise<void> {
    await this.emailInput.scrollIntoViewIfNeeded();
    await this.emailInput.fill(email);
  }

  async submit(): Promise<void> {
    await this.subscribeButton.click();
  }

  /**
   * The validation message the block is currently showing, if any.
   *
   * The message is a sibling of the field rather than an `aria-describedby`
   * target, so it is read from the block's text rather than from the input.
   */
  async validationMessage(): Promise<string> {
    return this.emailInput.evaluate((input, pattern) => {
      let block: Element = input;
      while (block.parentElement && block.getBoundingClientRect().height < 200) block = block.parentElement;
      const text = (block as HTMLElement).innerText.replace(/\s+/g, ' ').trim();
      return new RegExp(pattern.source, pattern.flags).test(text) ? text : '';
    }, NEWSLETTER.invalidMessagePattern);
  }

  async currentValue(): Promise<string> {
    return this.emailInput.inputValue();
  }
}
