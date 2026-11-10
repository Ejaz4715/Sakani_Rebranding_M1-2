import { Page, Locator, expect } from '@playwright/test';
import { escapeRegExp } from '../BasePage';
import {
  HEADER_NAV,
  HEADER_NAV_LABELS,
  HEADER_NAV_LABELS_EN,
  SERVICES_MENU_VIEW_ALL,
  TEST_USER,
  USER_MENU,
} from '@data/testData';

/**
 * The rebranded global header.
 *
 * Three of the five nav entries (`Properties for sale`, `Properties for rent`,
 * `Services`) open a mega-menu **on hover**; `Auctions` and `Support and help`
 * are plain navigations. Clicking a hover entry only toggles its active style,
 * so `openMegaMenu` hovers rather than clicks.
 */
export class Header {
  private readonly page: Page;

  readonly root: Locator;
  readonly logo: Locator;
  readonly searchButton: Locator;
  readonly languageToggle: Locator;
  readonly loginButton: Locator;
  readonly userMenuButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('header').first();
    this.logo = page.getByRole('img', { name: 'Sakani' }).first();
    // The magnifier carries an English `aria-label` even in the Arabic UI.
    this.searchButton = page.getByRole('button', { name: 'Search' }).first();
    this.languageToggle = this.root.locator('button').filter({ hasText: /^\s*(English|العربية)\s*$/ }).first();
    this.loginButton = this.root.locator('button').filter({ hasText: /^\s*(تسجيل الدخول|Log in)\s*$/ }).first();
    this.userMenuButton = this.root.locator('button').filter({ hasText: TEST_USER.displayName }).first();
  }

  /** A top-level nav entry, by its visible label. */
  navItem(label: string): Locator {
    return this.root.locator('button').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`) }).first();
  }

  async expectRendered(): Promise<void> {
    await expect(this.logo).toBeVisible();
    for (const label of Object.values(HEADER_NAV)) {
      await expect(this.navItem(label)).toBeVisible();
    }
    await expect(this.searchButton).toBeVisible();
    await expect(this.languageToggle).toBeVisible();
  }

  /**
   * Open a mega-menu and return its panel.
   *
   * The panel is anchored to the header and closes as soon as the pointer
   * leaves it, so callers must act on the returned locator without moving the
   * mouse elsewhere first.
   */
  async openMegaMenu(label: string): Promise<Locator> {
    const item = this.navItem(label);
    await item.hover();
    const panel = this.page.locator('div').filter({ hasText: SERVICES_MENU_VIEW_ALL }).last();
    await expect(item).toHaveAttribute('aria-haspopup', 'true');
    return panel;
  }

  /**
   * Hover the Services entry and follow "View all services".
   *
   * Two properties of this menu shape the implementation:
   *
   *  - The pointer must reach the panel item in a single jump. Playwright's own
   *    `click()` does that, but any *extra* mouse movement first — an explicit
   *    `hover()` on the item, or a stepped `mouse.move()` — travels outside the
   *    menu's hover region, closes the panel mid-action and leaves the click
   *    landing on the page behind it (`main-container ... intercepts pointer
   *    events`).
   *  - While the landing page is still settling, Angular re-renders the panel
   *    and the item detaches underneath the click. Re-opening and retrying is
   *    the honest fix; a fixed sleep would only hide the race.
   *
   * `noWaitAfter` because the panel unmounts as the navigation starts, so
   * Playwright would otherwise wait on a detached element.
   */
  async openServicesCatalogue(): Promise<void> {
    const viewAll = this.page.locator('button').filter({ hasText: SERVICES_MENU_VIEW_ALL }).first();
    let lastError: unknown;

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await this.navItem(HEADER_NAV.services).hover();
        await expect(viewAll).toBeVisible({ timeout: 15_000 });
        await viewAll.click({ noWaitAfter: true, timeout: 10_000 });
        return;
      } catch (error) {
        lastError = error;
        // Close the panel and let the page finish whatever re-render raced us.
        await this.page.mouse.move(10, 500).catch(() => undefined);
        await expect
          .poll(async () => viewAll.isVisible().catch(() => false), { timeout: 15_000 })
          .toBe(false);
      }
    }
    throw lastError;
  }

  /**
   * An entry inside an open mega-menu panel.
   *
   * Targeted on the leaf that carries the label rather than on the button:
   * every panel item is a `<button>` holding the label in a `<span>` *and* a
   * paragraph of description, so its own text is "وحدات تحت الإنشاء امتلك
   * وحدتك المستقبلية…" and an exact-match name resolves nothing. Clicking the
   * span activates the button around it.
   */
  megaMenuItem(label: string): Locator {
    return this.page
      .locator('span, p, h6')
      .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`) })
      .first();
  }

  /**
   * Hover a mega-menu entry and follow one of its items.
   *
   * Shares every constraint `openServicesCatalogue` documents — the pointer has
   * to reach the item in a single jump, and Angular re-renders the panel while
   * the landing page is still settling — so it retries the same way instead of
   * sleeping.
   */
  async openMegaMenuItem(navLabel: string, itemLabel: string): Promise<void> {
    const item = this.megaMenuItem(itemLabel);
    let lastError: unknown;

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await this.navItem(navLabel).hover();
        await expect(item).toBeVisible({ timeout: 15_000 });
        await item.click({ noWaitAfter: true, timeout: 10_000 });
        return;
      } catch (error) {
        lastError = error;
        // Close the panel and let the page finish whatever re-render raced us.
        await this.page.mouse.move(10, 600).catch(() => undefined);
        await expect
          .poll(async () => item.isVisible().catch(() => false), { timeout: 15_000 })
          .toBe(false);
      }
    }
    throw lastError;
  }

  /**
   * The audience toggle ("Individual" / "Business").
   *
   * Published in the English header only — see `HEADER_USER_TYPES`. Kept on the
   * component rather than in the spec so the day it appears in Arabic there is
   * one place to point it at.
   */
  userTypeToggle(label: string): Locator {
    return this.root.locator('button').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`) }).first();
  }

  /** Every control the header renders, in render order, for absence checks. */
  async controlTexts(): Promise<string[]> {
    return this.root.evaluate((header) =>
      [...header.querySelectorAll('button, [role="button"], [role="tab"], a')]
        .filter((element) => element.getBoundingClientRect().width > 0)
        .map((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    );
  }

  /**
   * Header controls that are neither a nav entry, the language toggle nor login
   * — which is what an audience toggle would be.
   *
   * Deliberately label-agnostic: asserting on "Individual"/"Business" would
   * only ever prove the *English* control exists, and would keep reporting the
   * Arabic header as broken even after the toggle arrives there under Arabic
   * labels. Anything extra the header publishes shows up here.
   */
  async audienceControls(): Promise<string[]> {
    const known = new Set<string>([
      ...HEADER_NAV_LABELS,
      ...HEADER_NAV_LABELS_EN,
      'English',
      'العربية',
      'تسجيل الدخول',
      'Log in',
      TEST_USER.displayName,
    ]);
    const texts = await this.controlTexts();
    return texts.filter((text) => !known.has(text) && ![...known].some((entry) => text.includes(entry)));
  }

  async openGlobalSearch(): Promise<void> {
    await this.searchButton.click();
  }

  async login(): Promise<void> {
    await this.loginButton.click();
  }

  async switchLanguage(): Promise<void> {
    await this.languageToggle.click();
  }

  async isAuthenticated(): Promise<boolean> {
    return this.userMenuButton.isVisible().catch(() => false);
  }

  async expectAuthenticated(): Promise<void> {
    await expect(this.userMenuButton).toBeVisible({ timeout: 60_000 });
  }

  async openUserMenu(): Promise<void> {
    await this.userMenuButton.click();
    await expect(this.page.getByText(USER_MENU.manageProfile, { exact: true }).first()).toBeVisible();
  }

  /** Click an entry in the authenticated user dropdown. */
  async openUserMenuItem(label: string): Promise<void> {
    await this.openUserMenu();
    await this.page.getByText(label, { exact: true }).first().click();
  }
}
