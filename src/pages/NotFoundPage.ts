import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES } from '@data/testData';

/**
 * Not-found pages.
 *
 * Beta serves two different ones, which is the substance of SAKANI-46035:
 *
 *  - `/rebranding-page-not-found` is a CMS page carrying the **rebranded**
 *    design: a large "404", an apology line, and "بيت" / "سوق إلكتروني" buttons
 *    pointing at `https://sakani.sa`.
 *  - Any genuinely unknown URL falls back to the **legacy** 404 template —
 *    the pre-rebranding header/footer and the heading
 *    "الصفحة التي تبحث عنها غير موجودة".
 *
 * This page object can address either, so the spec can assert both and record
 * the difference.
 */
export class NotFoundPage extends BasePage {
  protected readonly path = ROUTES.notFound;

  /** Rebranded variant. */
  readonly rebrandedCode: Locator;
  readonly rebrandedHomeButton: Locator;
  readonly rebrandedMarketplaceButton: Locator;

  /** Legacy fallback variant. */
  readonly legacyHeading: Locator;
  readonly legacyHomeButton: Locator;
  readonly legacyMarketplaceButton: Locator;

  constructor(page: Page) {
    super(page);
    this.rebrandedCode = page.getByText('404', { exact: true }).first();
    this.rebrandedHomeButton = page.locator('a, button').filter({ hasText: /^\s*بيت\s*$/ }).first();
    this.rebrandedMarketplaceButton = page.locator('a, button').filter({ hasText: /^\s*سوق إلكتروني\s*$/ }).first();

    this.legacyHeading = page.getByRole('heading', { name: /الصفحة التي تبحث عنها غير موجودة/ }).first();
    this.legacyHomeButton = page.locator('a, button').filter({ hasText: /^\s*الصفحة الرئيسية\s*$/ }).first();
    this.legacyMarketplaceButton = page.locator('a, button').filter({ hasText: /^\s*السوق العقاري\s*$/ }).first();
  }

  /** Open the dedicated rebranded 404 page. */
  async openRebranded(): Promise<void> {
    await this.gotoUntilReady(this.rebrandedCode, ROUTES.notFound);
  }

  /** Navigate to a URL that does not exist. */
  async openUnknown(route: string): Promise<void> {
    await this.goto(route);
  }

  /** Whichever 404 variant is on screen; fails if neither is. */
  async expectNotFoundShown(): Promise<'rebranded' | 'legacy'> {
    await expect
      .poll(async () => (await this.isRebranded()) || (await this.isLegacy()), {
        timeout: 60_000,
        message: 'expected a 404 page (rebranded or legacy) to render',
      })
      .toBe(true);
    return (await this.isRebranded()) ? 'rebranded' : 'legacy';
  }

  async isRebranded(): Promise<boolean> {
    return this.rebrandedMarketplaceButton.isVisible().catch(() => false);
  }

  async isLegacy(): Promise<boolean> {
    return this.legacyHeading.isVisible().catch(() => false);
  }
}
