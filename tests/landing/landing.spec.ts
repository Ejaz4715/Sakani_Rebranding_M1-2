import { test, expect, Products } from '@fixtures/pages.fixture';
import { LandingPage } from '@pages/LandingPage';
import { COOKIE_CONSENT, HEADER_NAV_LABELS, ROUTES } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-46026 — Landing page.
 *
 * The manual case asks for the login button and the search bar. Beta serves
 * editorial placeholder copy in the hero carousel ("Test Main Banner", "CTA
 * title"), so these assertions target the durable controls rather than the
 * marketing text, which would be flaky by design.
 */
test.describe('SAKANI-46026 - Landing page', () => {
  test(
    'SAKANI-46026-01 - Validate the landing page components (login button, search bar)',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ landingPage, header }) => {
      await landingPage.open();

      await logStep('Step 01: the header renders its navigation, search and login controls');
      await header.expectRendered();
      for (const label of HEADER_NAV_LABELS) {
        await expect(header.navItem(label)).toBeVisible();
      }
      await expect(header.loginButton).toBeVisible();
      await expect(header.loginButton).toBeEnabled();
      await expect(header.searchButton).toBeVisible();

      await logStep('Step 02: the hero search bar renders every control');
      await landingPage.expectSearchBarRendered();

      await logStep('Step 03: the login button leads to the login page');
      await header.login();
      await landingPage.page.waitForURL(new RegExp(ROUTES.login.replace(/\//g, '\\/')));
      await expect(landingPage.page.locator('#username')).toBeVisible();
    }
  );

  test(
    'SAKANI-46026-02 - Landing page search bar accepts a city and keeps its controls enabled',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ landingPage }) => {
      await landingPage.open();
      await landingPage.expectSearchBarRendered();

      await landingPage.searchCity('الرياض');

      await expect(landingPage.cityInput).toHaveValue('الرياض');
      await expect(landingPage.exploreButton).toBeEnabled();
    }
  );

  /**
   * The consent bottom sheet is normally suppressed by the fixture (it renders
   * a click-swallowing backdrop). This case uses a pristine context so the
   * banner itself can be observed, which is part of "landing page components".
   */
  test('SAKANI-46026-03 - Cookie consent banner is presented and records the choice', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ pristinePage }) => {
    const landing = new LandingPage(pristinePage);
    await landing.open();

    await expect(landing.cookies.modal).toBeVisible({ timeout: 60_000 });
    await expect(landing.cookies.acceptButton).toBeVisible();
    await expect(landing.cookies.rejectButton).toBeVisible();

    await landing.cookies.accept();

    expect(await landing.cookies.storedChoice()).toBe('true');
    expect(COOKIE_CONSENT.storageKey).toBe('accept_cookies');
  });
});
