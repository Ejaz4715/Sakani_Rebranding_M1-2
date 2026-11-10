import { test as base, Page } from '@playwright/test';
import { LandingPage } from '@pages/LandingPage';
import { LoginPage } from '@pages/LoginPage';
import { ServicesPage } from '@pages/ServicesPage';
import { ServiceTemplatePage } from '@pages/ServiceTemplatePage';
import { ContactUsPage } from '@pages/ContactUsPage';
import { FaqsPage } from '@pages/FaqsPage';
import { ReportsPage } from '@pages/ReportsPage';
import { NewsPage } from '@pages/NewsPage';
import { SupportAndHelpPage } from '@pages/SupportAndHelpPage';
import { TermsPage, ExecutiveRegulationsPage } from '@pages/LegalDocumentPage';
import { NotFoundPage } from '@pages/NotFoundPage';
import { ProfilePage } from '@pages/ProfilePage';
import { SearchResultsPage } from '@pages/SearchResultsPage';
import { Header } from '@components/Header';
import { Footer } from '@components/Footer';
import { GlobalSearch } from '@components/GlobalSearch';
import { Newsletter } from '@components/Newsletter';
import { seedBrowserState } from '@helpers/browserState';

/**
 * Page-object fixtures, plus the browser-state seeding every journey needs.
 *
 * Usage:
 *   import { test, expect } from '@fixtures/pages.fixture';
 *   test('example', async ({ landingPage }) => { ... });
 */
type Fixtures = {
  landingPage: LandingPage;
  loginPage: LoginPage;
  servicesPage: ServicesPage;
  serviceTemplatePage: ServiceTemplatePage;
  contactUsPage: ContactUsPage;
  faqsPage: FaqsPage;
  reportsPage: ReportsPage;
  newsPage: NewsPage;
  supportPage: SupportAndHelpPage;
  termsPage: TermsPage;
  regulationsPage: ExecutiveRegulationsPage;
  notFoundPage: NotFoundPage;
  profilePage: ProfilePage;
  searchResultsPage: SearchResultsPage;
  header: Header;
  footer: Footer;
  globalSearch: GlobalSearch;
  newsletter: Newsletter;
  /** A page that has NOT had cookie consent pre-seeded. */
  pristinePage: Page;
};

/**
 * Every journey starts from a page whose first-visit interstitials have been
 * suppressed — see `@helpers/browserState` for why that is done up front rather
 * than dismissed afterwards. The landing-page test that needs to *see* the
 * consent banner takes the `pristinePage` fixture instead.
 */
export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await seedBrowserState(page);
    await use(page);
  },

  /** A second context with no seeded consent, for asserting the banner itself. */
  pristinePage: async ({ browser }, use) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'ar-SA',
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    await seedBrowserState(page, { keepCookieBanner: true });
    await use(page);
    await context.close();
  },

  landingPage: async ({ page }, use) => use(new LandingPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  servicesPage: async ({ page }, use) => use(new ServicesPage(page)),
  serviceTemplatePage: async ({ page }, use) => use(new ServiceTemplatePage(page)),
  contactUsPage: async ({ page }, use) => use(new ContactUsPage(page)),
  faqsPage: async ({ page }, use) => use(new FaqsPage(page)),
  reportsPage: async ({ page }, use) => use(new ReportsPage(page)),
  newsPage: async ({ page }, use) => use(new NewsPage(page)),
  supportPage: async ({ page }, use) => use(new SupportAndHelpPage(page)),
  termsPage: async ({ page }, use) => use(new TermsPage(page)),
  regulationsPage: async ({ page }, use) => use(new ExecutiveRegulationsPage(page)),
  notFoundPage: async ({ page }, use) => use(new NotFoundPage(page)),
  profilePage: async ({ page }, use) => use(new ProfilePage(page)),
  searchResultsPage: async ({ page }, use) => use(new SearchResultsPage(page)),
  header: async ({ page }, use) => use(new Header(page)),
  footer: async ({ page }, use) => use(new Footer(page)),
  globalSearch: async ({ page }, use) => use(new GlobalSearch(page)),
  newsletter: async ({ page }, use) => use(new Newsletter(page)),
});

export { expect } from '@playwright/test';

export enum Products {
  Marketplace = 'Marketplace',
  DigitarBroker = 'Digitar-Broker',
  DigitarDeveloper = 'Digitar-Developer',
  SharedProducts = 'Shared-Products',
  GovSupport = 'Government-Support',
  Loyalty = 'Loyalty',
  SelfConstruction = 'Self-Construction',
  MarketService = 'Market-Service',
  RealEstateData = 'Real-Estate-Data',
  Sayal = 'Sayal',
  Rebranding = 'Rebranding',
}
