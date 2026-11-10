import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { Header } from './components/Header';
import { EXECUTIVE_REGULATIONS, ROUTES, TERMS } from '@data/testData';

/**
 * Shared page object for the two long-form legal documents, which use an
 * identical template: an `<h1>` title, a side navigation of clickable section
 * names rendered as buttons, and the matching `<h2>` sections in the body.
 *
 * Clicking a side-nav entry scrolls its section into view; the application does
 * not change the URL or add a hash, so "clickable" is asserted by the section
 * heading coming into the viewport.
 */
export class LegalDocumentPage extends BasePage {
  readonly header: Header;

  readonly title: Locator;

  /** Set per document rather than per class, so both share this page object. */
  protected readonly path: string;

  constructor(page: Page, documentPath: string, documentTitle: string) {
    super(page);
    this.path = documentPath;
    this.header = new Header(page);
    this.title = page.getByRole('heading', { name: documentTitle, level: 1 }).first();
  }

  async open(): Promise<void> {
    await this.gotoUntilReady(this.title);
    await this.hydrate();
  }

  /** A side-navigation entry. */
  navEntry(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true }).first();
  }

  /** The body section a navigation entry points at. */
  section(name: string): Locator {
    return this.page.getByRole('heading', { name, exact: true, level: 2 }).first();
  }

  async expectHeadingsRendered(headings: readonly string[]): Promise<void> {
    await expect(this.title).toBeVisible();
    for (const heading of headings) {
      await expect(this.navEntry(heading), `side-nav entry "${heading}"`).toBeVisible();
      await expect(this.section(heading), `document section "${heading}"`).toHaveCount(1);
    }
  }

  /** Click a navigation entry and assert its section is brought into view. */
  async openSection(name: string): Promise<void> {
    await this.navEntry(name).click();
    await expect(this.section(name)).toBeInViewport({ timeout: 30_000 });
  }
}

export class TermsPage extends LegalDocumentPage {
  constructor(page: Page) {
    super(page, ROUTES.terms, TERMS.title);
  }
}

export class ExecutiveRegulationsPage extends LegalDocumentPage {
  constructor(page: Page) {
    super(page, ROUTES.executiveRegulations, EXECUTIVE_REGULATIONS.title);
  }
}
