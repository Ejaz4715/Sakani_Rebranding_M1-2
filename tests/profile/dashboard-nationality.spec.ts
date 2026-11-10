import { test, expect, Products } from '@fixtures/pages.fixture';
import { LoginPage } from '@pages/LoginPage';
import { ProfilePage } from '@pages/ProfilePage';
import { seedBrowserState } from '@helpers/browserState';
import { scrollThroughPage } from '@helpers/hydrate';
import { DASHBOARD, NON_SAUDI_USER } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-47569 — M2, dashboard by nationality.
 *
 * The three cases split on who is signed in: a Saudi beneficiary keeps the full
 * dashboard, a non-Saudi one is cut down to two cards and is stopped from
 * opening the eligibility service.
 *
 * Only one identity has ever been issued to this suite and it is Saudi, so
 * TC-02 and TC-03 are written in full and gated on
 * `SAKANI_NON_SAUDI_NATIONAL_ID` (see `.env.example`). They skip with that
 * reason until the identity is supplied, and run unchanged once it is —
 * signing in themselves rather than reusing the stored Saudi session.
 */
test.describe('SAKANI-47569 - Dashboard by nationality', () => {
  test('SAKANI-47569-01 - Verify Saudi users continue to see the full dashboard', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ profilePage }) => {
    await profilePage.openDashboard();

    await logStep('Step 01: the overview renders more than the reduced set of cards');
    const cards = await profilePage.dashboardCards().count();
    expect(cards, `a Saudi beneficiary should keep the full dashboard, not the ${DASHBOARD.nonSaudiCardCount}-card one`).toBeGreaterThan(DASHBOARD.nonSaudiCardCount);

    await logStep('Step 02: the housing-support services are all offered');
    for (const service of DASHBOARD.saudiServices) {
      expect(await profilePage.dashboardOffers(service), `dashboard card "${service}"`).toBe(true);
    }

    await logStep('Step 03: and so are the blocks that depend on being eligible');
    for (const block of DASHBOARD.saudiOnlyBlocks) {
      expect(await profilePage.dashboardOffers(block), `dashboard block "${block}"`).toBe(true);
    }
    expect(await profilePage.dashboardOffers(DASHBOARD.browseUnits)).toBe(true);

    await logStep('Step 04: the eligibility service is open to this identity');
    await profilePage.goto(DASHBOARD.eligibilityService.route);
    const start = profilePage.page.locator(`a[href="${DASHBOARD.eligibilityService.href}"]`).first();
    await expect(start, 'the eligibility service should offer its call to action').toBeVisible({ timeout: 90_000 });
  });

  test('SAKANI-47569-02 - Verify the dashboard displays only two cards for Non-Saudi users', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ browser }) => {
    test.skip(!NON_SAUDI_USER.nationalId, 'needs a non-Saudi beta identity — set SAKANI_NON_SAUDI_NATIONAL_ID in .env to run this');
    // Signs in for itself rather than reusing the stored Saudi session, so it
    // needs the same budget `auth.setup` does: up to 90s for the `/app` shell
    // (twice, if it stalls on its loading splash), 90s for the Nafath modal and
    // up to 180s for beta's auto-approval. The default 180s cannot cover that.
    test.setTimeout(420_000);

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'ar-SA',
      ignoreHTTPSErrors: true,
      // Explicitly empty: a context made from the `browser` fixture inherits
      // the project's options, and this project pins the stored *Saudi*
      // session. Without this the app finds that session, skips the login page
      // entirely, and the sign-in below waits for a form that never renders.
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await seedBrowserState(page);

    try {
      await new LoginPage(page).login(NON_SAUDI_USER.nationalId);

      const profile = new ProfilePage(page);
      await profile.openDashboard();

      await logStep('Step 01: the overview is cut down to two cards');
      await expect(profile.dashboardCards()).toHaveCount(DASHBOARD.nonSaudiCardCount);

      await logStep('Step 02: the two it keeps are the mortgage services');
      for (const service of DASHBOARD.nonSaudiServices) {
        expect(await profile.dashboardOffers(service), `dashboard card "${service}"`).toBe(true);
      }

      /**
       * The split is drawn around housing support, not around finance: the
       * mortgage product and its calculator stay, while the advisory service
       * and everything that depends on being eligible for support goes.
       */
      await logStep('Step 03: everything tied to housing support is withheld');
      for (const block of DASHBOARD.nonSaudiWithheld) {
        expect(await profile.dashboardOffers(block), `"${block}" depends on housing-support eligibility and should not be offered to a non-Saudi user`).toBe(false);
      }
    } finally {
      await context.close();
    }
  });

  test(
    'SAKANI-47569-03 - Verify the "service limited to nationals only" pop up appears for non-Saudi users',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ browser }) => {
      test.skip(!NON_SAUDI_USER.nationalId, 'needs a non-Saudi beta identity — set SAKANI_NON_SAUDI_NATIONAL_ID in .env to run this');
      // See SAKANI-47569-02: this one signs in for itself too.
      test.setTimeout(420_000);

      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        locale: 'ar-SA',
        ignoreHTTPSErrors: true,
        // Explicitly empty: a context made from the `browser` fixture inherits
        // the project's options, and this project pins the stored *Saudi*
        // session. Without this the app finds that session, skips the login page
        // entirely, and the sign-in below waits for a form that never renders.
        storageState: { cookies: [], origins: [] },
      });
      const page = await context.newPage();
      await seedBrowserState(page);

      try {
        await new LoginPage(page).login(NON_SAUDI_USER.nationalId);

        await page.goto(DASHBOARD.eligibilityService.route, { waitUntil: 'domcontentloaded' });
        const start = page.locator(`a[href="${DASHBOARD.eligibilityService.href}"]`).first();
        await expect(start).toBeVisible({ timeout: 90_000 });

        // The control is a real anchor, and the gate only happens because the
        // application intercepts the click. Clicking the moment it paints can
        // beat that handler being wired, in which case the browser simply follows
        // the href and no dialog is ever raised — so let the page settle first.
        await scrollThroughPage(page);
        await start.scrollIntoViewIfNeeded();
        await start.click();

        const gate = DASHBOARD.eligibilityService.nationalsOnly;

        await logStep('Step 01: the service refuses to open and says why');
        /**
         * Located by wording *and* visibility. The page holds several other
         * `role="dialog"` elements — a logout confirmation and the cookie
         * notice — and the gate itself is rendered more than once, with the
         * hidden copies ahead of the live one in the DOM, so neither the role
         * nor document order is enough to reach it on its own.
         */
        const dialog = page.locator('[role="dialog"]:visible').filter({ hasText: gate.title }).first();

        await expect(
          dialog,
          'a dialog should explain the service is for nationals only; if the page has moved to ' + `${DASHBOARD.eligibilityService.href} the gate was bypassed altogether (at ${page.url()})`
        ).toBeVisible({ timeout: 60_000 });
        await expect(dialog).toContainText(gate.body);

        // By text, not by role and name: the dialog's "موافق" puts its label in
        // a nested element and computes an empty accessible name, so
        // `getByRole('button', { name })` resolves to nothing — the same gap
        // the Nafath and cookie-consent controls have.
        await expect(
          dialog
            .locator('button, [role="button"]')
            .filter({ hasText: new RegExp(`^\\s*${gate.confirm}\\s*$`) })
            .first(),
          `the gate should offer its "${gate.confirm}" acknowledgement`
        ).toBeVisible();

        await logStep('Step 02: and the service itself never opens');
        expect(page.url(), 'the eligibility journey should not start').not.toContain(DASHBOARD.eligibilityService.href);
        expect(page.url()).toContain(DASHBOARD.eligibilityService.route);
      } finally {
        await context.close();
      }
    }
  );
});
