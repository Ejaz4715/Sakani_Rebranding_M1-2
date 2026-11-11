import { test, expect, Products } from '@fixtures/pages.fixture';
import { API, ROUTES, TEST_USER } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

test.describe('SAKANI-46024 - Login page', () => {
  test('SAKANI-46024-01 - Validate the content of login page', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ loginPage, header }) => {
    await loginPage.open();

    await logStep('Step 01: the identifier form and both sign-in paths are present');
    await loginPage.expectFormRendered();
    await expect(loginPage.usernameInput).toHaveAttribute('placeholder', 'أدخل معرفك أو رقم هاتفك أو بريدك الإلكتروني');
    await expect(loginPage.heading).toBeVisible();

    await logStep('Step 02: submit is disabled until an identifier is entered');
    await expect(loginPage.submitButton).toBeDisabled();
    await loginPage.enterIdentifier(TEST_USER.nationalId);
    await expect(loginPage.submitButton).toBeEnabled();

    await logStep('Step 03: terms and reCAPTCHA notices are shown');
    await expect(loginPage.termsText).toBeVisible();
    await expect(loginPage.securityNotice).toBeVisible();

    await logStep('Step 04: the login page is rendered inside the rebranded shell');
    await header.expectRendered();
  });

  test('SAKANI-46024-02 - Check the user ability to login', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ loginPage, header, page }) => {
    const calls: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      if (/authApi|captchaApi|beneficiary\/me/.test(url)) calls.push(`${response.status()} ${new URL(url).pathname}`);
    });

    await loginPage.open(ROUTES.landing);
    await loginPage.enterIdentifier(TEST_USER.nationalId);
    await loginPage.submitIdentifier();

    await logStep('Step 01: the Nafath modal opens with the identifier pre-filled');
    await expect(loginPage.nafathModalHeading).toBeVisible({ timeout: 90_000 });
    await expect(loginPage.nafathModalIdInput).toHaveValue(TEST_USER.nationalId);

    await loginPage.confirmNafath();
    await loginPage.waitForAuthenticated();

    await logStep('Step 02: the session is established for the expected identity');
    await page.goto(ROUTES.landing, { waitUntil: 'domcontentloaded' });
    await header.expectAuthenticated();
    await expect(header.userMenuButton).toContainText(TEST_USER.displayName);
    await expect(header.loginButton).toHaveCount(0);

    await logStep('Step 03: the documented authentication endpoints all succeeded');
    expect(calls.some((c) => c.startsWith('200') && c.includes(API.captcha))).toBe(true);
    expect(calls.some((c) => c.startsWith('200') && c.includes(API.iamLogin))).toBe(true);
    expect(calls.some((c) => c.startsWith('200') && c.includes(API.me))).toBe(true);
  });

  /**
   * Restored 2026-11-11. Listed in the E2E inventory (DEF-01) but absent from
   * the code base, so the defect it tracks had stopped being checked.
   *
   * A user sent to login from a page should come back to that page once
   * signed in. The journey starts from the service catalogue, a rebranded page
   * a guest can reach, and hands its path to the login page as `returnUrl` —
   * exactly what the header's login control does.
   */
  test('SAKANI-46024-03 - Login returns the user to the page they started from', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ loginPage, page }) => {
    // Same budget as the other Nafath journeys: shell, modal and auto-approval.
    test.setTimeout(420_000);
    const origin = ROUTES.services;

    await logStep(`Step 01: sign in from ${origin}`);
    await loginPage.login(TEST_USER.nationalId, origin);

    await logStep('Step 02: the user is returned to the page they started from');
    await page.waitForURL((url) => url.pathname === origin, { waitUntil: 'commit', timeout: 90_000 }).catch(() => undefined);
    expect(new URL(page.url()).pathname, `login should return to ${origin}; it landed on ${page.url()} (DEF-01)`).toBe(origin);
  });
});
