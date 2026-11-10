import { test, expect, Products } from '@fixtures/pages.fixture';
import { PROFILE_SECTIONS, ROUTES, USER_MENU } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-46032 — Profile page.
 *
 * Runs in the `authenticated` project, which reuses the storage state written
 * once per execution by `tests/setup/auth.setup.ts`, so no additional Nafath
 * approval is requested here.
 */
test.describe('SAKANI-46032 - Profile', () => {
  test('SAKANI-46032-01 - Check the navigation to profile', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ profilePage, header, page }) => {
    await logStep('Step 01: the header user menu offers its entries');
    await page.goto(ROUTES.landing, { waitUntil: 'domcontentloaded' });
    await header.expectAuthenticated();
    await header.openUserMenu();
    for (const label of Object.values(USER_MENU)) {
      await expect(page.getByText(label, { exact: true }).first(), `user-menu entry "${label}"`).toBeVisible();
    }

    await logStep('Step 02: "manage profile" opens the account portal');
    await page.getByText(USER_MENU.manageProfile, { exact: true }).first().click();
    await page.waitForURL(/\/app\/user-profile\//, { timeout: 90_000 });
    await profilePage.expectLoaded();
    await profilePage.expectSessionBelongsToTestUser();
  });

  test(
    'SAKANI-46032-02 - Check the functionality of all the available options in the profile',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ profilePage }) => {
      await profilePage.open();

      await logStep('Step 01: every documented option is offered in the side navigation');
      await profilePage.expectSideNavRendered(PROFILE_SECTIONS);

      for (const section of PROFILE_SECTIONS) {
        if (section.kind === 'navigates' && section.path) {
          await logStep(`Step 02: "${section.label}" opens ${section.path}`);
          const url = await profilePage.openSection(section.label, section.path);
          expect(url, `"${section.label}" should navigate to ${section.path}`).toContain(section.path);
          if (section.heading) {
            await expect(profilePage.page.getByRole('heading', { name: section.heading }).first()).toBeVisible();
          }
        } else if (section.kind === 'navigates') {
          /**
           * "المساعدة والدعم" is offered in the profile navigation but lands on
           * `/page-not-found` — the option is unreachable. The assertion states
           * the intended behaviour and is expected to fail while the defect is
           * open (DEF-09).
           */
          await logStep(`Step 03: "${section.label}" opens a real page`);
          const url = await profilePage.openSection(section.label);
          expect(url, `"${section.label}" should open a working page; beta lands on a not-found page (${url}) (DEF-09)`).not.toMatch(/page-not-found|\/app\/error/);
        } else {
          await logStep(`Step 04: "${section.label}" expands to reveal its sub-items`);
          const { before, after } = await profilePage.expandGroup(section.label);
          expect(after.length, `"${section.label}" should add entries to the side menu`).toBeGreaterThan(before.length);

          if (section.children) {
            for (const child of section.children) {
              expect(after, `"${section.label}" should reveal "${child}"`).toContain(child);
            }
          }
        }
      }
    }
  );
});
