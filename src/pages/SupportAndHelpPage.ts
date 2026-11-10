import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ROUTES, SUPPORT_LOCATIONS } from '@data/testData';

/**
 * The help & support hub — `/rebranding-support-and-help`.
 *
 * Two areas matter to the manual cases: a grid of support-channel cards (each
 * card is one anchor wrapping title, description and any action label), and the
 * "comprehensive locations" carousel with a Directions control per centre and
 * previous/next arrows.
 *
 * The locations carousel sits well below the fold, so `open()` hydrates the
 * page before any of its locators are used.
 */
export class SupportAndHelpPage extends BasePage {
  protected readonly path = ROUTES.supportAndHelp;

  readonly header: Header;
  readonly footer: Footer;

  readonly title: Locator;
  readonly breadcrumbHome: Locator;
  readonly locationsSection: Locator;
  readonly nextArrow: Locator;
  readonly previousArrow: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new Header(page);
    this.footer = new Footer(page);

    this.title = page.getByRole('heading', { name: 'الدعم والمساعدة', exact: true }).first();
    this.breadcrumbHome = page.locator('button, a').filter({ hasText: /^\s*الصفحة الرئيسية\s*$/ }).first();
    this.locationsSection = page.getByText(SUPPORT_LOCATIONS.sectionTitle, { exact: true }).first();
    // Each arrow exists twice: the `sakani-wc-*` host (`display: contents`, zero
    // sized) and the real button inside it. Target the button, or actions land
    // on a zero-sized element that can never be scrolled into view.
    this.nextArrow = page.locator('button[aria-label="next"]').first();
    this.previousArrow = page.locator('button[aria-label="previous"]').first();
  }

  /** Pagination bullets of the locations carousel. */
  slideBullets(): Locator {
    return this.page.locator('.swiper-pagination-bullet');
  }

  /**
   * Index of the slide the carousel is currently showing.
   *
   * All four centre cards stay in the DOM and simply translate horizontally, so
   * "which centres are visible" does not change when the carousel advances. The
   * active pagination bullet is the signal that does.
   */
  async activeSlideIndex(): Promise<number> {
    return this.page.evaluate(() =>
      [...document.querySelectorAll('.swiper-pagination-bullet')].findIndex((bullet) =>
        bullet.className.includes('swiper-pagination-bullet-active'),
      ),
    );
  }

  async open(): Promise<void> {
    await this.gotoUntilReady(this.title);
    await this.hydrate();
  }

  /** A support-channel card, matched by its title text. */
  card(title: string): Locator {
    return this.page.locator('a').filter({ hasText: new RegExp(title) }).first();
  }

  /** The Directions control for one centre, resolved by its position. */
  directionsButton(index: number): Locator {
    return this.page
      .locator('button, a')
      .filter({ hasText: new RegExp(`^\\s*${SUPPORT_LOCATIONS.directionsLabel}\\s*$`) })
      .nth(index);
  }

  directionsButtons(): Locator {
    return this.page
      .locator('button, a')
      .filter({ hasText: new RegExp(`^\\s*${SUPPORT_LOCATIONS.directionsLabel}\\s*$`) });
  }

  centreTitle(title: string): Locator {
    return this.page.getByText(title, { exact: true }).first();
  }

  async expectLocationsRendered(): Promise<void> {
    await this.locationsSection.scrollIntoViewIfNeeded();
    await expect(this.locationsSection).toBeVisible();
    for (const centre of SUPPORT_LOCATIONS.centres) {
      await expect(this.centreTitle(centre.title)).toBeVisible();
    }
  }

  /**
   * Click a Directions control and return the tab it opens.
   *
   * The control opens the national Balady map service in a new tab; the caller
   * closes the returned page.
   */
  async openDirections(index: number): Promise<Page> {
    const button = this.directionsButton(index);
    await button.scrollIntoViewIfNeeded();
    const [popup] = await Promise.all([this.page.context().waitForEvent('page'), button.click()]);
    await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
    return popup;
  }
}
