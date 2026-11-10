import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CookieConsent } from './components/CookieConsent';
import { Newsletter } from './components/Newsletter';
import {
  APP_DOWNLOAD,
  HERO_CAROUSEL,
  HERO_VIDEO,
  LANDING_METRICS,
  LANDING_PRODUCTS,
  LANDING_SCENARIOS,
  LANDING_SEARCH,
  PARTNER_LOGOS,
  ROUTES,
} from '@data/testData';

/** One metric from the key-figures band. */
export interface LandingMetric {
  value: string;
  caption: string;
}

/** The promotional content of one hero slide. */
export interface HeroSlide {
  title: string;
  description: string;
  ctas: string[];
}

/**
 * The rebranded landing page — `/rebranding-sakani`.
 *
 * Beta serves editorial placeholder content in the hero carousel ("Test Main
 * Banner", "CTA title", "CTA Test"), so this page object deliberately exposes
 * the durable controls — login, global search, the hero search bar — and not
 * the marketing copy.
 *
 * SAKANI-41908 added the rest of the page: the brand-promo CTA, the product
 * cards and developer logos, the customer-scenario cards, the key metrics and
 * app-store promotion, and the footer newsletter. Everything below the hero is
 * lazily hydrated, so `hydrate()` has to have run before those locators
 * resolve — `openFully()` does both.
 */
export class LandingPage extends BasePage {
  protected readonly path = ROUTES.landing;

  readonly header: Header;
  readonly footer: Footer;
  readonly cookies: CookieConsent;
  readonly newsletter: Newsletter;

  /** Hero "explore your housing options" search bar. */
  readonly buyTab: Locator;
  readonly rentTab: Locator;
  readonly cityInput: Locator;
  readonly unitTypeSelect: Locator;
  readonly priceRangeSelect: Locator;
  readonly exploreButton: Locator;

  /** Brand promo. Beta publishes it as a file, not an embedded player. */
  readonly videoCta: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new Header(page);
    this.footer = new Footer(page);
    this.cookies = new CookieConsent(page);
    this.newsletter = new Newsletter(page);

    this.buyTab = page.getByRole('tab', { name: LANDING_SEARCH.buyTab, exact: true }).first();
    this.rentTab = page.getByRole('tab', { name: LANDING_SEARCH.rentTab, exact: true }).first();
    this.cityInput = page.getByPlaceholder(LANDING_SEARCH.cityPlaceholder).first();
    this.unitTypeSelect = page.getByText(LANDING_SEARCH.unitTypeLabel, { exact: true }).first();
    this.priceRangeSelect = page.getByText(LANDING_SEARCH.priceRangeLabel, { exact: true }).first();
    this.exploreButton = this.byText(LANDING_SEARCH.submit).first();

    // One CTA per carousel slide, and only the active slide's is on screen, so
    // the visible ones are the only usable targets.
    this.videoCta = page.locator('a[href$=".mp4"]:visible').filter({ hasText: HERO_VIDEO.cta }).first();
  }

  async open(): Promise<void> {
    await this.gotoUntilReady(this.header.logo);
  }

  /** Open and walk the whole page, for the sections below the hero. */
  async openFully(): Promise<void> {
    await this.open();
    await this.hydrate();
  }

  /** The whole hero search bar, as the manual case calls it: "search bar". */
  async expectSearchBarRendered(): Promise<void> {
    await expect(this.cityInput).toBeVisible();
    await expect(this.buyTab).toBeVisible();
    await expect(this.rentTab).toBeVisible();
    await expect(this.unitTypeSelect).toBeVisible();
    await expect(this.priceRangeSelect).toBeVisible();
    await expect(this.exploreButton).toBeVisible();
    await expect(this.exploreButton).toBeEnabled();
  }

  async searchCity(city: string): Promise<void> {
    await this.cityInput.fill(city);
  }

  /* --- hero: brand promo and the buy/rent tabs -------------------------- */

  /** Every promo CTA on the page, one per carousel slide. */
  videoCtas(): Locator {
    return this.page.locator('a[href$=".mp4"]');
  }

  /* --- hero banner carousel --------------------------------------------- */

  /** The pagination dots, one per published slide. */
  heroDots(): Locator {
    return this.page.locator(`[aria-label^="Go to slide"]:visible`);
  }

  heroDot(slide: number): Locator {
    return this.page.locator(`[aria-label="${HERO_CAROUSEL.slideLabel(slide)}"]:visible`).first();
  }

  /**
   * The label of the dot the carousel currently marks as current.
   *
   * `aria-current` rather than the visible copy: the carousel auto-rotates, so
   * copy read a second apart belongs to different slides, while the dot state is
   * exact at the moment it is read.
   */
  async currentSlideLabel(): Promise<string | null> {
    return this.page.evaluate(() => {
      const dot = [...document.querySelectorAll('[aria-label^="Go to slide"]')]
        .filter((element) => element.getBoundingClientRect().width > 0)
        .find((element) => element.getAttribute('aria-current') === 'true');
      return dot?.getAttribute('aria-label') ?? null;
    });
  }

  /**
   * The promotional content of the slide currently on screen.
   *
   * Read in one pass so the title, description and CTA all belong to the same
   * slide — the carousel can advance between two separate reads.
   */
  async activeSlide(): Promise<HeroSlide | null> {
    return this.page.evaluate(
      ({ activeSlide, titleClass, descriptionClass }) => {
        const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
        const slide = document.querySelector(activeSlide);
        if (!slide) return null;
        return {
          title: clean(slide.querySelector(`.${titleClass}`)?.textContent),
          description: clean(slide.querySelector(`.${descriptionClass}`)?.textContent),
          ctas: [...slide.querySelectorAll('a[href], button')]
            .filter((element) => element.getBoundingClientRect().width > 0)
            .map((element) => clean(element.textContent))
            .filter(Boolean),
        };
      },
      {
        activeSlide: HERO_CAROUSEL.activeSlide,
        titleClass: HERO_CAROUSEL.titleClass,
        descriptionClass: HERO_CAROUSEL.descriptionClass,
      },
    );
  }

  /**
   * Activate the brand promo and return the tab it opens, if any.
   *
   * Scripted rather than clicked: the carousel rotates the CTA out from under
   * the pointer mid-action, and a `click()` on `:visible` flaps between slides
   * until it times out — proven while exploring. Dispatching the click on a
   * concrete anchor sidesteps the race without weakening what is asserted,
   * because the anchor is the thing under test.
   */
  async activatePromo(): Promise<Page | null> {
    const anchor = this.videoCtas().first();
    const opened = this.page.context().waitForEvent('page', { timeout: 30_000 }).catch(() => null);
    await anchor.evaluate((element) => (element as HTMLAnchorElement).click());
    return opened;
  }

  /** In-page video players, of which the rebranded hero has none. */
  async playerCount(): Promise<number> {
    return this.page.locator('video').count();
  }

  /** Dialogs the page is currently showing, by tag, for the modal assertions. */
  async openDialogs(): Promise<string[]> {
    return this.page.evaluate(() =>
      [...document.querySelectorAll('[role="dialog"], sakani-wc-dialog-v6, skn-dialog-v6')]
        .filter((element) => element.getBoundingClientRect().width > 0)
        .map((element) => element.tagName.toLowerCase()),
    );
  }

  /** The label of the tab currently selected in the hero search bar. */
  async selectedSearchTab(): Promise<string | null> {
    const selected = this.page.locator('[role="tab"][aria-selected="true"]').first();
    return (await selected.innerText()).replace(/\s+/g, ' ').trim();
  }

  async selectSearchTab(tab: Locator): Promise<void> {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }

  /* --- products and the developer logo strip ---------------------------- */

  /** A product card, matched on the marketplace query it hands off to. */
  productCard(href: string): Locator {
    return this.page.locator(`a[href="${href}"]`).first();
  }

  partnerLogos(): Locator {
    return this.page.locator(`img[alt="${PARTNER_LOGOS.alt}"]`);
  }

  /**
   * Whether each developer logo is wrapped in a link, and where it goes.
   *
   * Reported per logo rather than as a single boolean so a failure can say how
   * many of them are inert.
   */
  async partnerLogoTargets(): Promise<Array<{ src: string; href: string | null }>> {
    return this.page.evaluate((alt) => {
      return [...document.querySelectorAll(`img[alt="${alt}"]`)].map((img) => ({
        src: (img.getAttribute('src') ?? '').split('/').pop() ?? '',
        href: img.closest('a')?.getAttribute('href') ?? null,
      }));
    }, PARTNER_LOGOS.alt);
  }

  async expectProductsRendered(): Promise<void> {
    for (const product of LANDING_PRODUCTS) {
      const card = this.productCard(product.href);
      await expect(card, `product card "${product.title}"`).toBeVisible();
      await expect(card).toContainText(product.title);
    }
  }

  /* --- customer scenarios ----------------------------------------------- */

  scenarioCard(title: string): Locator {
    return this.page.getByRole('heading', { name: title, exact: true }).first();
  }

  /** Every CTA inside the scenario band, with the destination it carries. */
  async scenarioLinkTargets(): Promise<Array<{ text: string; href: string | null }>> {
    return this.page.evaluate((labels) => {
      const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
      return [...document.querySelectorAll('a')]
        .filter((anchor) => anchor.getBoundingClientRect().width > 0)
        .map((anchor) => ({ text: clean(anchor.textContent), href: anchor.getAttribute('href') }))
        .filter((entry) => (labels as string[]).includes(entry.text));
    }, [...LANDING_SCENARIOS.links]);
  }

  /* --- key metrics and app download ------------------------------------- */

  /**
   * The metric figures and their captions.
   *
   * The values count up as the band scrolls into view, so callers must assert
   * the format rather than a number.
   */
  async metrics(): Promise<LandingMetric[]> {
    return this.page.evaluate((captions) => {
      const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
      return (captions as string[])
        .map((caption) => {
          const label = [...document.querySelectorAll('*')].find(
            (element) => element.children.length === 0 && clean(element.textContent) === caption,
          );
          if (!label) return null;
          // Climb until the block holds the figure as well as the caption.
          let block: Element | null = label;
          for (let i = 0; i < 5 && block?.parentElement; i++) {
            block = block.parentElement;
            const figure = block.querySelector('h1,h2,h3,h4');
            if (figure && clean(figure.textContent) !== caption) {
              return { value: clean(figure.textContent), caption };
            }
          }
          return { value: '', caption };
        })
        .filter((metric): metric is LandingMetric => metric !== null);
    }, [...LANDING_METRICS.captions]);
  }

  storeLink(store: keyof typeof APP_DOWNLOAD & ('appStore' | 'googlePlay')): Locator {
    return this.page.locator(`a:has(img[alt="${APP_DOWNLOAD[store].alt}"])`).first();
  }

  get qrCode(): Locator {
    return this.page.locator(`img[alt="${APP_DOWNLOAD.qrAlt}"]`).first();
  }
}
