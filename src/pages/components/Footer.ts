import { Page, Locator, expect } from '@playwright/test';
import { FooterLink, ROUTES } from '@data/testData';

/**
 * The rebranded global footer.
 *
 * It is the canonical entry point to several pages under test (news, reports,
 * terms, executive regulations, support, FAQs), so the journeys navigate
 * through it rather than typing routes wherever the manual case says "navigate
 * to the page".
 *
 * The footer sits below the fold on every page, so `BasePage.hydrate()` must
 * have run before these locators resolve.
 */
export class Footer {
  private readonly page: Page;

  readonly root: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('footer').first();
  }

  link(name: string): Locator {
    return this.root.getByRole('link', { name, exact: true }).first();
  }

  /** Footer links whose destination is part of this suite. */
  readonly destinations = {
    news: { label: 'الأخبار', href: ROUTES.news },
    reports: { label: 'تقارير سكني', href: ROUTES.reports },
    terms: { label: 'سياسة الخصوصية', href: ROUTES.terms },
    executiveRegulations: { label: 'اللائحة التنفيذية لتنظيم الدعم السكني', href: ROUTES.executiveRegulations },
    supportAndHelp: { label: 'الدعم والمساعدة', href: ROUTES.supportAndHelp },
    faqs: { label: 'الأسئلة الشائعة', href: ROUTES.faqs },
    marketplace: { label: 'السوق العقاري', href: ROUTES.marketplace },
  } as const;

  /**
   * The locator for one entry of `FOOTER_LINKS`.
   *
   * The icon-only links carry no text; their accessible name comes from the
   * image `alt`, which `getByRole('link', { name })` resolves just the same.
   */
  linkFor(entry: FooterLink): Locator {
    return this.link((entry.label ?? entry.alt) as string);
  }

  /** Every destination the footer currently publishes, in render order. */
  async hrefs(): Promise<string[]> {
    return this.root.evaluate((footer) =>
      [...footer.querySelectorAll('a[href]')].map((anchor) => anchor.getAttribute('href') ?? ''),
    );
  }

  async expectRendered(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  /** Follow a footer link and wait for the destination to commit. */
  async open(destination: keyof Footer['destinations']): Promise<void> {
    const { label, href } = this.destinations[destination];
    const link = this.link(label);
    await link.scrollIntoViewIfNeeded();
    await expect(link).toHaveAttribute('href', href);
    await link.click();
    await this.page.waitForURL(new RegExp(`${href.replace(/[/\-]/g, '\\$&')}$`));
  }
}
