import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Newsletter } from './components/Newsletter';
import { SERVICE_TEMPLATE } from '@data/testData';

/** A related-service card, as rendered under "خدمات ذات صلة". */
export interface RelatedService {
  title: string;
  href: string | null;
}

/**
 * A service detail page — `/rebranding-services/<slug>`.
 *
 * Beta serves these from more than one template, which is what SAKANI-42357
 * TC-08 is about:
 *
 *  - the **full** template (e.g. `rebranding-check-eligibility`) carries a
 *    `.rebranding-service-tabs` block, a `.rebranding-service-sidebar-wrapper`
 *    of service details and support links, a "خدمات ذات صلة" band and the
 *    page-rating control;
 *  - the **editorial** template (e.g. `rebranding-off-plan-projects`) is a plain
 *    run of content sections with a single call to action and none of the above.
 *
 * The tabs are `div[role="tab"]` with `aria-selected`, but they carry no
 * `aria-controls` and there is no `role="tabpanel"` anywhere, so the panel can
 * only be read as the text of the tab block itself — reported as an
 * accessibility finding.
 */
export class ServiceTemplatePage extends BasePage {
  protected readonly path = SERVICE_TEMPLATE.full.route;

  readonly header: Header;
  readonly footer: Footer;
  readonly newsletter: Newsletter;

  readonly breadcrumb: Locator;
  readonly tabList: Locator;
  readonly sidebar: Locator;
  readonly relatedHeading: Locator;
  readonly ratingQuestion: Locator;
  readonly ratingYes: Locator;
  readonly ratingNo: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new Header(page);
    this.footer = new Footer(page);
    this.newsletter = new Newsletter(page);

    this.breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' }).first();
    this.tabList = page.locator('.rebranding-service-tabs').first();
    this.sidebar = page.locator('.rebranding-service-sidebar-wrapper').first();
    this.relatedHeading = page.getByRole('heading', { name: SERVICE_TEMPLATE.relatedHeading, exact: true }).first();

    this.ratingQuestion = page.getByText(SERVICE_TEMPLATE.rating.question, { exact: false }).first();
    // The control is rendered twice (one copy per breakpoint), so both the
    // question and the buttons need anchoring to a single instance.
    this.ratingYes = this.byText(SERVICE_TEMPLATE.rating.yes, 'button').first();
    this.ratingNo = this.byText(SERVICE_TEMPLATE.rating.no, 'button').first();
  }

  /** Open a service detail page and wait for its title. */
  async openService(route: string, title: string): Promise<void> {
    await this.gotoUntilReady(this.heading(title), route);
    await this.hydrate();
  }

  heading(title: string): Locator {
    return this.page.getByRole('heading', { name: title, exact: true }).first();
  }

  /* --- tabs -------------------------------------------------------------- */

  tab(label: string): Locator {
    return this.page.getByRole('tab', { name: label, exact: true }).first();
  }

  tabs(): Locator {
    return this.page.getByRole('tab');
  }

  async selectedTab(): Promise<string | null> {
    const selected = this.page.locator('[role="tab"][aria-selected="true"]').first();
    if ((await selected.count()) === 0) return null;
    return (await selected.innerText()).replace(/\s+/g, ' ').trim();
  }

  /**
   * Activate a tab and wait for it to report itself selected.
   *
   * The styling and the content swap land a beat after the click, so reading
   * either straight back can still see the previous tab.
   */
  async selectTab(label: string): Promise<void> {
    await this.tab(label).click();
    await expect(this.tab(label)).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 });
  }

  /** Text of the tab block, minus the tab labels themselves. */
  async tabPanelText(): Promise<string> {
    const raw = (await this.tabList.innerText()).replace(/\s+/g, ' ').trim();
    return SERVICE_TEMPLATE.full.tabs.reduce((text, label) => text.replace(label, '').trim(), raw);
  }

  /* --- details sidebar --------------------------------------------------- */

  /** The label/value rows the sidebar lists, in render order. */
  async sidebarRows(): Promise<string[]> {
    return this.sidebar.evaluate((side) =>
      [...side.querySelectorAll('*')]
        .filter((node) => node.children.length === 0)
        .map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    );
  }

  sidebarLink(label: string): Locator {
    return this.sidebar.getByRole('link', { name: label, exact: true }).first();
  }

  /* --- related services -------------------------------------------------- */

  /**
   * The related-service cards and where each one leads.
   *
   * The cards are `.card-root` blocks wrapped in an anchor; the band is found
   * by climbing from its heading until the ancestor holds more than one.
   */
  async relatedServices(): Promise<RelatedService[]> {
    return this.page.evaluate((heading) => {
      const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
      const title = [...document.querySelectorAll('h1,h2,h3,h4')].find((node) => clean(node.textContent) === heading);
      if (!title) return [];

      let band: Element | null = title;
      for (let i = 0; i < 6 && band?.parentElement; i++) {
        band = band.parentElement;
        if (band.querySelectorAll('.card-root').length >= 2) break;
      }

      return [...(band?.querySelectorAll('.card-root') ?? [])].map((card) => {
        const anchor = card.closest('a') ?? card.querySelector('a');
        return {
          title: clean(card.querySelector('h1,h2,h3,h4,h5')?.textContent ?? card.textContent).slice(0, 60),
          href: anchor?.getAttribute('href') ?? null,
        };
      });
    }, SERVICE_TEMPLATE.relatedHeading);
  }

  get relatedViewAll(): Locator {
    return this.page
      .locator('a')
      .filter({ hasText: new RegExp(`^\\s*${SERVICE_TEMPLATE.relatedViewAll.label}\\s*$`) })
      .first();
  }

  /* --- calls to action ---------------------------------------------------- */

  cta(label: string): Locator {
    return this.byText(label).first();
  }

  /** The "start service" control, which is an anchor on the full template. */
  get startService(): Locator {
    return this.page.locator(`a[href="${SERVICE_TEMPLATE.full.startCta.href}"]`).first();
  }

  /** Whether this page is rendered from the full template. */
  async usesFullTemplate(): Promise<boolean> {
    return (await this.tabList.count()) > 0 && (await this.sidebar.count()) > 0;
  }
}
