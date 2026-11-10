import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { Header } from '@components/Header';
import { seedBrowserState } from '@helpers/browserState';
import { ROUTES, STORAGE_STATE, TEST_USER } from '@data/testData';
import { Products } from '@fixtures/pages.fixture';

/**
 * Authenticate once per execution and persist the session.
 *
 * Only the profile journeys depend on this. The login spec (SAKANI-46024)
 * deliberately opts out of the stored state so the real Nafath journey is
 * exercised on every run, and so the suite does not request an OTP/Nafath
 * approval more than once per execution.
 */
/**
 * The default 180s test budget cannot cover this journey on a cold
 * environment: opening `/app` allows 90s for the shell (and reloads once if it
 * stalls on its loading splash), the Nafath modal another 90s, and beta's
 * auto-approval up to 180s. This is the first navigation of a run, so it is
 * also the one that pays for the cold edge — it timed out at 180s on
 * 2026-08-30 with the app still showing its loading state, which then skipped
 * both profile journeys that depend on it.
 */
setup.setTimeout(420_000);

setup('authenticate beta session', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ page, context }) => {
  await seedBrowserState(page);

  const login = new LoginPage(page);
  await login.login(TEST_USER.nationalId);

  // Confirm the session really belongs to the expected identity before saving.
  await page.goto(ROUTES.profileDashboard, { waitUntil: 'domcontentloaded' });
  const header = new Header(page);
  await header.expectAuthenticated();
  await expect(header.userMenuButton).toContainText(TEST_USER.displayName);

  await context.storageState({ path: STORAGE_STATE });
});
