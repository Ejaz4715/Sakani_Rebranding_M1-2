import { Page, Locator, expect } from '@playwright/test';
import { COOKIE_CONSENT } from '@data/testData';

/**
 * The cookie-consent bottom sheet.
 *
 * It renders with a backdrop that intercepts every pointer event, so the suite
 * normally pre-seeds `localStorage.accept_cookies` (see the fixture) and this
 * component never appears. It exists for the landing-page test, which needs to
 * observe the banner itself, and as a manual escape hatch.
 */
export class CookieConsent {
  private readonly page: Page;

  readonly modal: Locator;
  readonly acceptButton: Locator;
  readonly rejectButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('#acceptCookiesModal');
    // The buttons' accessible names do not compute reliably on this app; filter
    // on text instead. See BasePage.byText for the full rationale.
    this.acceptButton = page.locator('button').filter({ hasText: COOKIE_CONSENT.accept }).first();
    this.rejectButton = page.locator('button').filter({ hasText: COOKIE_CONSENT.reject }).first();
  }

  async isShown(): Promise<boolean> {
    return this.modal.isVisible().catch(() => false);
  }

  async accept(): Promise<void> {
    if (!(await this.isShown())) return;
    await this.acceptButton.click();
    await expect(this.modal).toBeHidden();
  }

  /** The value the site persists once a choice has been made. */
  async storedChoice(): Promise<string | null> {
    return this.page.evaluate((key) => window.localStorage.getItem(key), COOKIE_CONSENT.storageKey);
  }
}
