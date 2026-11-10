import { test, expect, Products } from '@fixtures/pages.fixture';
import { LOGIN_ERRORS, LOGIN_PAGE, TEST_USER } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

test.describe('SAKANI-41917 - Unified login page rebranding', () => {
  test('SAKANI-41917-01 Verify links remain clickable after color update', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ loginPage, page }) => {
    await loginPage.open();

    await logStep('Step 01: The consent links are rendered and carry their destinations');
    for (const link of LOGIN_PAGE.links) {
      const anchor = page.getByRole('link', { name: link.label, exact: true }).first();
      await expect(anchor, `consent link "${link.label}"`).toBeVisible();
      await expect(anchor).toHaveAttribute('href', link.href);
      await expect(anchor).toBeEnabled();
    }

    await logStep('Step 02: the security provider notice links to its privacy policy');
    for (const link of LOGIN_PAGE.securityNoticeLinks) {
      const anchor = page.locator(`a[href="${link.href}"]`);
      await expect(anchor, `${link.label} link ${link.href}`).toBeVisible();
      await expect(anchor).toHaveAttribute('target', '_blank');
    }

    for (const link of LOGIN_PAGE.links) {
      await logStep(`Step 03: "${link.label}" actually opens ${link.href}`);
      await loginPage.open();

      const anchor = page.getByRole('link', { name: link.label, exact: true });
      await anchor.click();

      await page.waitForURL(new RegExp(`${link.href}$`), {
        waitUntil: 'domcontentloaded',
        timeout: 90_000,
      });
      await expect.poll(async () => (await page.locator('body').innerText()).trim().length, { timeout: 60_000 }).toBeGreaterThan(200);
    }
  });

  test('SAKANI-41917-02 - Verify message content is unchanged after rebranding', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ loginPage, page }) => {
    await loginPage.open();

    await logStep('Step 01: the welcome message is unchanged');
    await expect(page.getByText(LOGIN_PAGE.heading, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(LOGIN_PAGE.intro, { exact: true }).first()).toBeVisible();

    await logStep('Step 02: the identifier field keeps its label and prompt');
    await expect(page.getByText(LOGIN_PAGE.identifierLabel, { exact: true }).first()).toBeVisible();
    await expect(loginPage.usernameInput).toHaveAttribute('placeholder', LOGIN_PAGE.identifierPlaceholder);

    await logStep('Step 03: both sign-in paths are still offered by name');
    await expect(loginPage.submitButton).toHaveText(new RegExp(LOGIN_PAGE.submit));
    await expect(loginPage.nafathButton).toHaveText(new RegExp(LOGIN_PAGE.nafath));

    await logStep('Step 04: the consent sentence and security provider notice are unchanged');
    const consent = page.getByText(LOGIN_PAGE.consent, { exact: true }).first();
    await expect(consent, 'the consent sentence should read exactly as before the rebranding').toBeVisible();
    await expect(loginPage.securityNotice).toBeVisible();
    await expect(loginPage.securityNotice).toHaveText(LOGIN_PAGE.securityNotice);

    await logStep('Step 05: the message stays put once the form is being filled in');
    await loginPage.enterIdentifier(TEST_USER.nationalId);
    await expect(page.getByText(LOGIN_PAGE.heading, { exact: true }).first()).toBeVisible();
    await expect(loginPage.submitButton).toBeEnabled();
  });

  test(
    'SAKANI-41917-03 - Verify login error message content with an incorrect user ID',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ loginPage, page }) => {
      await loginPage.open();

      for (const scenario of LOGIN_ERRORS) {
        await logStep(`Step 01: "${scenario.value}" — ${scenario.name}`);
        await loginPage.usernameInput.fill('');
        await loginPage.enterIdentifier(scenario.value);

        await expect(page.getByText(scenario.message, { exact: true }).first(), `"${scenario.value}" should be refused with "${scenario.message}"`).toBeVisible({ timeout: 30_000 });

        await expect(loginPage.submitButton, 'an identifier the form rejects must not be submittable').toBeDisabled();
      }

      await logStep('Step 02: correcting the identifier clears the error and re-opens submit');
      await loginPage.usernameInput.fill('');
      await loginPage.enterIdentifier(TEST_USER.nationalId);

      for (const scenario of LOGIN_ERRORS) {
        await expect(page.getByText(scenario.message, { exact: true })).toHaveCount(0);
      }
      await expect(loginPage.submitButton).toBeEnabled();
    }
  );
});
