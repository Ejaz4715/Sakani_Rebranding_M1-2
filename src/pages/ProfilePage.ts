import { Page, Locator, expect } from '@playwright/test';
import { BasePage, escapeRegExp } from './BasePage';
import { Header } from './components/Header';
import { DASHBOARD, PROFILE_SECTIONS, ProfileSection, ROUTES, TEST_USER } from '@data/testData';

/**
 * The account portal — `/app/user-profile/*`.
 *
 * Unlike the CMS pages this is the pre-existing Angular application wearing the
 * rebranded theme. Its side navigation mixes plain links with expandable groups
 * ("أنشطتي", "التفضيلات", "المساعدة والدعم"): a group reveals its children in
 * place instead of navigating, which pushes everything below it down the list.
 * That is why `openSection` always starts from a freshly loaded dashboard.
 */
export class ProfilePage extends BasePage {
  protected readonly path = ROUTES.profileDashboard;

  readonly header: Header;

  /** `<aside><skn-side-menu-v6><nav>` — the account portal's own navigation. */
  readonly sideMenu: Locator;
  readonly sideNav: Locator;
  readonly greeting: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new Header(page);
    this.sideMenu = page.locator('skn-side-menu-v6');
    this.sideNav = this.sideMenu.getByText('لوحة البيانات', { exact: true }).first();
    this.greeting = page.getByText(/مرحبًا/).first();
  }

  /**
   * Open the account portal and wait for the side menu to be fully populated.
   *
   * Waiting only for the first entry to paint is not enough: the Angular router
   * finishes wiring the menu a moment later, and a click landing in that window
   * is swallowed. Waiting for the whole complement of top-level entries is a
   * positive readiness signal for that.
   */
  async open(): Promise<void> {
    await this.gotoUntilReady(this.sideNav);
    await expect
      .poll(async () => this.sideMenu.locator('skn-side-menu-item-v6').count(), { timeout: 60_000 })
      .toBeGreaterThanOrEqual(PROFILE_SECTIONS.length);
  }

  /**
   * A side-navigation entry.
   *
   * Scoped to the side menu because these labels are not unique on the page:
   * the header's user menu carries "المفضلة" and "المساعدة والدعم" (hidden while
   * the menu is closed), and the dashboard body renders a "المستشار العقاري"
   * service card. A page-wide text lookup resolves to one of those instead.
   */
  navItem(label: string): Locator {
    return this.sideMenu
      .locator('skn-side-menu-item-v6')
      .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`) })
      .first();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.sideNav).toBeVisible();
    await this.header.expectAuthenticated();
  }

  async expectSideNavRendered(sections: readonly ProfileSection[]): Promise<void> {
    for (const section of sections) {
      await expect(this.navItem(section.label), `side-nav entry "${section.label}"`).toBeVisible();
    }
  }

  /**
   * Activate a side-nav entry from a clean dashboard load and return the URL
   * the portal settled on.
   *
   * The wait is deliberately tolerant — it never throws. Routing here is
   * client-side, so reading `page.url()` straight after the click reports the
   * *previous* route and every entry looks broken. Waiting for the expected
   * destination fixes that, but swallowing the timeout keeps the verdict with
   * the caller's assertion, which can say which entry went where; a page object
   * throwing "waitForURL timed out" would bury that.
   */
  async openSection(label: string, expectedPath?: string): Promise<string> {
    await this.open();
    const before = this.page.url();

    const item = this.navItem(label);
    await item.scrollIntoViewIfNeeded();
    await item.click();

    if (expectedPath) {
      await this.page
        .waitForURL(new RegExp(escapeRegExp(expectedPath)), { timeout: 60_000 })
        .catch(() => undefined);
    } else {
      await expect
        .poll(() => this.page.url() !== before, { timeout: 60_000 })
        .toBe(true)
        .catch(() => undefined);
    }

    return this.page.url();
  }

  /**
   * Expand a side-nav group from a clean dashboard load and report the entries
   * before and after.
   *
   * The baseline has to be taken *after* the reload: `openSection` reloads the
   * page, so a count captured beforehand belongs to a different page state —
   * and if the previously-tested group was left expanded, that stale baseline
   * is larger than the fresh one.
   */
  async expandGroup(label: string): Promise<{ before: string[]; after: string[] }> {
    await this.open();
    const before = await this.revealedChildren();

    const item = this.navItem(label);
    await item.scrollIntoViewIfNeeded();
    await item.click();

    await expect
      .poll(async () => (await this.revealedChildren()).length, { timeout: 45_000 })
      .toBeGreaterThan(before.length);

    return { before, after: await this.revealedChildren() };
  }

  /** Every entry currently listed in the side menu, including revealed children. */
  async revealedChildren(): Promise<string[]> {
    return this.page.evaluate(() => {
      const menu = document.querySelector('skn-side-menu-v6');
      if (!menu) return [];
      return [...menu.querySelectorAll('skn-side-menu-item-v6')]
        .filter((item) => item.getBoundingClientRect().width > 0)
        .map((item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    });
  }

  /** Reach the profile the way a user does: header user menu -> manage profile. */
  async openFromUserMenu(landingPath: string): Promise<void> {
    await this.goto(landingPath);
    await this.header.expectAuthenticated();
    await this.header.openUserMenuItem('إدارة الملف الشخصي');
    await this.page.waitForURL(/\/app\/user-profile\//, { timeout: 90_000 });
  }

  async expectSessionBelongsToTestUser(): Promise<void> {
    await expect(this.header.userMenuButton).toContainText(TEST_USER.displayName);
  }

  /* --------------------------------------------------------------------- */
  /* Dashboard overview (SAKANI-47569)                                      */
  /* --------------------------------------------------------------------- */

  /**
   * The cards the overview is built from.
   *
   * `skn-card-v6` is the element the portal uses for every dashboard tile, so
   * counting it is what "the dashboard displays only two cards" can be measured
   * against.
   */
  dashboardCards(): Locator {
    return this.page.locator(DASHBOARD.cardElement);
  }

  /**
   * Open the dashboard and wait for its cards to finish arriving.
   *
   * The overview paints its shell before the beneficiary's own data lands, so a
   * count taken too early is always low; polling for a settled count is the
   * signal that the tiles are all in.
   */
  async openDashboard(): Promise<void> {
    await this.gotoUntilReady(this.sideNav, ROUTES.profileDashboard);
    // The lower cards (the support waiver and "browse units") arrive after the
    // eligibility section below the fold has loaded; walking the page brings
    // them into existence. Without this the count "settled" on the first three.
    await this.hydrate();
    // Settled = the same non-zero count on three consecutive reads ~2s apart,
    // so a pause between two batches of tiles is not mistaken for the end.
    const history: number[] = [];
    await expect
      .poll(
        async () => {
          history.push(await this.dashboardCards().count());
          const recent = history.slice(-3);
          return recent.length === 3 && recent[0] > 0 && recent.every((count) => count === recent[0]);
        },
        { timeout: 90_000, intervals: [2000] },
      )
      .toBe(true);
  }

  /** The text of each dashboard card, in render order. */
  async dashboardCardTexts(): Promise<string[]> {
    return this.page.evaluate(
      (selector) =>
        [...document.querySelectorAll(selector)]
          .filter((card) => card.getBoundingClientRect().width > 0)
          .map((card) => (card.textContent ?? '').replace(/\s+/g, ' ').trim()),
      DASHBOARD.cardElement,
    );
  }

  /** True when some dashboard card mentions the given text. */
  async dashboardOffers(text: string): Promise<boolean> {
    return (await this.dashboardCardTexts()).some((card) => card.includes(text));
  }
}
