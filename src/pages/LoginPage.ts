import { Page, Locator, expect } from '@playwright/test';
import { BasePage, PAGE_READY_TIMEOUT } from './BasePage';
import { Header } from './components/Header';
import { LOGIN_PAGE, ROUTES } from '@data/testData';

/**
 * Login page — `/app/authentication/login`.
 *
 * Verified beta flow:
 *   1. Enter an identifier (national ID / phone / email) into `#username`.
 *      "تسجيل الدخول" stays disabled until the field has a value.
 *   2. Submitting fires `POST /captchaApi/grecaptcha/validate` (invisible
 *      reCAPTCHA, passes silently in a real browser) then
 *      `POST /authApi/api/v4/beneficiary_session/check`.
 *   3. A "تسجيل الدخول بواسطة نفاذ" modal appears with the ID pre-filled in
 *      `#national-id-number`. Its own "المتابعة" fires `POST /authApi/api/v4/iam`
 *      (202) and the app then polls `/iam/check` until `/iam/login` returns 200.
 *   4. `GET /mainIntermediaryApi/v4/beneficiary/me` completes the session.
 *
 * On beta the Nafath request **auto-approves after ~15-25 seconds** with no
 * phone interaction, which is what makes this journey automatable.
 */
export class LoginPage extends BasePage {
  protected readonly path = ROUTES.login;

  readonly header: Header;

  readonly usernameInput: Locator;
  readonly submitButton: Locator;
  readonly nafathButton: Locator;
  readonly termsText: Locator;
  readonly securityNotice: Locator;
  readonly heading: Locator;

  /** Nafath confirmation modal. */
  readonly nafathModal: Locator;
  readonly nafathModalIdInput: Locator;
  readonly nafathModalContinue: Locator;
  readonly nafathModalHeading: Locator;

  /** First-time registration step shown to an identity with no Sakani account. */
  readonly registrationStep: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new Header(page);

    this.usernameInput = page.locator('#username');
    // Anchored so the page's own "تسجيل الدخول" submit never matches the
    // header's login button, which carries the same label.
    this.submitButton = page
      .locator('button[type="submit"], form button')
      .filter({ hasText: /^\s*(تسجيل الدخول|Log in)\s*$/ })
      .first();
    this.nafathButton = page
      .locator('button')
      .filter({ hasText: /المتابعة مع نفاذ|Continue with Nafath/i })
      .first();
    this.termsText = page.getByText(/أقبل سكني|I accept Sakani/i).first();
    this.securityNotice = page.getByText(/Cloudflare|reCAPTCHA/i).first();
    // The page's own heading. This used to target the marketing slogan
    // "حيث يصبح عقار أحلامك حقيقة" in the visual half of the split; the
    // 2026-11 release no longer publishes that text anywhere on the page
    // (flagged for clarification in the migration report).
    this.heading = page.getByRole('heading', { name: LOGIN_PAGE.heading, exact: true }).first();

    this.nafathModalIdInput = page.locator('#national-id-number');
    this.nafathModal = page.locator('div').filter({ has: this.nafathModalIdInput }).last();
    this.nafathModalHeading = page.getByText(/تسجيل الدخول بواسطة نفاذ/).first();
    this.registrationStep = page.getByText('تأكيد معلوماتك', { exact: true }).first();
    // The modal's "المتابعة" computes no accessible name, so `getByRole` finds
    // nothing; text filtering is the strategy that resolves it. Anchored so it
    // cannot match the page's "المتابعة مع نفاذ".
    this.nafathModalContinue = page
      .locator('button')
      .filter({ hasText: /^\s*المتابعة\s*$/ })
      .first();
  }

  /**
   * Open the login page.
   *
   * `returnUrl` is accepted so callers can express where the journey came from,
   * even though beta currently ignores it after a successful Nafath approval
   * (see the login spec).
   *
   * Goes through `gotoUntilReady` rather than a plain wait: on a cold edge the
   * `/app` shell can stall on its loading splash — the page renders only
   * `<status>COMMON.LOADING</status>` and never bootstraps, so `#username` never
   * arrives. A reload recovers it; waiting longer does not.
   */
  async open(returnUrl?: string): Promise<void> {
    const url = returnUrl ? `${this.path}?returnUrl=${encodeURIComponent(returnUrl)}` : this.path;
    await this.gotoUntilReady(this.usernameInput, url);
  }

  async expectFormRendered(): Promise<void> {
    await expect(this.usernameInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    await expect(this.nafathButton).toBeVisible();
    await expect(this.termsText).toBeVisible();
    await expect(this.securityNotice).toBeVisible();
  }

  async enterIdentifier(identifier: string): Promise<void> {
    await this.usernameInput.fill(identifier);
  }

  /**
   * Submit with the keyboard rather than a click: the sticky header's hover
   * mega-menu opens as the pointer travels upward and its panel overlays the
   * form, intercepting the click.
   */
  async submitIdentifier(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
    await this.usernameInput.press('Enter');
  }

  /** Confirm the Nafath modal, raising the push request. */
  async confirmNafath(): Promise<void> {
    await expect(this.nafathModalIdInput).toBeVisible({ timeout: 90_000 });
    await expect(this.nafathModalContinue).toBeVisible();
    await this.nafathModalContinue.click();
  }

  /**
   * Wait for beta's auto-approval to complete and the app to leave login.
   *
   * An identity Nafath approves but Sakani has no account for is shown a
   * first-time registration step ("تأكيد معلوماتك") instead. Completing it would
   * create a real beneficiary account, so the journey stops there and says so,
   * rather than waiting out the full budget for a redirect that will never come.
   */
  async waitForAuthenticated(timeout = 180_000): Promise<void> {
    const left = this.page
      .waitForURL((url) => !url.toString().includes('/authentication/login'), { waitUntil: 'commit', timeout })
      .then(() => 'authenticated' as const);
    const registration = this.registrationStep
      .waitFor({ state: 'visible', timeout })
      .then(() => 'registration' as const);

    const outcome = await Promise.race([left, registration]);
    // Whichever lost keeps waiting in the background; keep it from surfacing.
    left.catch(() => undefined);
    registration.catch(() => undefined);

    if (outcome === 'registration') {
      throw new Error(
        'TEST DATA BLOCKER: Nafath approved this identity, but it has no Sakani account on this environment — the app asks to register it ' +
          '("تأكيد معلوماتك"). Completing that would create a real account, so the journey stops here. Provide an identity that is already registered.',
      );
    }
  }

  /** Full happy-path login: identifier -> Nafath -> authenticated session. */
  async login(identifier: string, returnUrl?: string): Promise<void> {
    await this.open(returnUrl);
    await this.enterIdentifier(identifier);
    await this.submitIdentifier();
    await this.confirmNafath();
    await this.waitForAuthenticated();
  }
}
