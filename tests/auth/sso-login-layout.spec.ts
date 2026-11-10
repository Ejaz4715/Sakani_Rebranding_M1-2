import { test, expect, Products } from '@fixtures/pages.fixture';
import { LOGIN_PAGE, TEST_USER } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

test.describe('SAKANI-43048 - SSO login layout', () => {
  test('SAKANI-43048-01 - Verify buttons and input fields function normally', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ loginPage, page }) => {
    await loginPage.open();

    await logStep('Step 01: the page is laid out as two equal halves');
    const split = await loginPage.usernameInput.evaluate((input) => {
      let pane: Element = input;
      while (pane.parentElement && pane.getBoundingClientRect().width < window.innerWidth * 0.3) {
        pane = pane.parentElement;
      }
      const siblings = [...(pane.parentElement?.children ?? [])].map((child) => Number((child.getBoundingClientRect().width / window.innerWidth).toFixed(2)));
      return { panes: siblings, viewport: window.innerWidth };
    });

    expect(split.panes, 'the login page should render two panes').toHaveLength(2);
    for (const ratio of split.panes) {
      expect(ratio, `pane occupying ${ratio * 100}% of the viewport`).toBeGreaterThan(0.45);
      expect(ratio).toBeLessThan(0.55);
    }

    await logStep('Step 02: the form half holds the controls');
    await loginPage.expectFormRendered();
    await expect(page.getByText(LOGIN_PAGE.heading, { exact: true }).first()).toBeVisible();

    await logStep('Step 03: the identifier field takes, keeps and clears input');
    await expect(loginPage.usernameInput).toBeEditable();
    await loginPage.enterIdentifier(TEST_USER.nationalId);
    await expect(loginPage.usernameInput).toHaveValue(TEST_USER.nationalId);

    await loginPage.usernameInput.fill('');
    await expect(loginPage.usernameInput).toHaveValue('');

    await logStep('Step 04: submit follows the field rather than the layout');
    await expect(loginPage.submitButton).toBeDisabled();
    await loginPage.enterIdentifier(TEST_USER.nationalId);
    await expect(loginPage.submitButton).toBeEnabled();

    await logStep('Step 05: the Nafath button is clickable in its new position');
    await expect(loginPage.nafathButton).toBeVisible();
    await expect(loginPage.nafathButton).toBeEnabled();
    const obstructed = await loginPage.nafathButton.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      const atCentre = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return !(atCentre && (button.contains(atCentre) || atCentre.contains(button)));
    });
    expect(obstructed, 'the Nafath button should be the top element at its own centre').toBe(false);
  });
});
