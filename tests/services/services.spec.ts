import { test, expect, Products } from '@fixtures/pages.fixture';
import { HEADER_NAV, ROUTES, SERVICES, SERVICES_MENU_COLUMNS, SERVICE_CATEGORIES, SERVICE_SEARCH, SERVICE_USER_TYPES } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-46022 — Service catalogue & page templates.
 */
test.describe('SAKANI-46022 - Service catalogue', () => {
  test(
    'SAKANI-46022-01 - Check the user ability to navigate to services page',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ landingPage, servicesPage, header, page }) => {
      await landingPage.open();

      await logStep('Step 01: the Services mega-menu opens on hover and lists its columns');
      await header.navItem(HEADER_NAV.services).hover();
      for (const column of SERVICES_MENU_COLUMNS) {
        await expect(page.getByRole('heading', { name: column, exact: true }).first()).toBeVisible();
      }

      await logStep('Step 02: "View all services" opens the catalogue');
      await header.openServicesCatalogue();
      await page.waitForURL(new RegExp(`${ROUTES.services}$`));
      await expect(servicesPage.title).toBeVisible();
    }
  );

  test(
    'SAKANI-46022-02 - Validate the availability of all the services on services page',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ servicesPage }) => {
      await servicesPage.open();

      await logStep('Step 01: all three categories are rendered');
      await servicesPage.expectCategoriesRendered();
      expect(SERVICE_CATEGORIES.length).toBe(3);

      await logStep('Step 02: every catalogued service is listed with the right destination');
      await servicesPage.expectServicesAvailable(SERVICES);

      await logStep('Step 03: no service has silently disappeared from the catalogue');
      const listed = await servicesPage.listedServiceHrefs();
      const missing = SERVICES.filter((service) => !listed.includes(service.href)).map((s) => s.name);
      expect(missing, 'services present in the baseline but absent from the page').toEqual([]);

      await logStep('Step 04: the user-type filters are offered');
      await servicesPage.expectUserTypeFiltersRendered();
      expect(SERVICE_USER_TYPES.length).toBe(6);
    }
  );

  test('SAKANI-46022-03 - Services catalogue search narrows the listing', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ servicesPage }) => {
    await servicesPage.open();
    const before = await servicesPage.listedServiceHrefs();
    expect(before.length).toBeGreaterThan(1);

    await servicesPage.search(SERVICE_SEARCH.term);

    await expect.poll(async () => (await servicesPage.listedServiceHrefs()).length, { timeout: 45_000 }).toBeLessThan(before.length);

    const match = SERVICES.find((service) => service.name === SERVICE_SEARCH.expected);
    expect(match, 'baseline must contain the expected search hit').toBeDefined();
    await expect(servicesPage.serviceLink(match!.href)).toBeVisible();
  });
});
