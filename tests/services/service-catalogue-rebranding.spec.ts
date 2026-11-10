import { test, expect, Products } from '@fixtures/pages.fixture';
import { escapeRegExp } from '@pages/BasePage';
import { CATALOGUE_FILTERS, CATALOGUE_SEARCH, HEADER_NAV_LABELS, ROUTES, SERVICE_USER_TYPES } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-42321 — M1 service catalogue page rebranding.
 *
 * TC-02..TC-05 of this ticket describe the landing page's own furniture — the
 * hero banner and its promo, the product grid and partner logos, the customer
 * scenarios, and the metrics and app-store links. Those are the same components
 * SAKANI-41908 covers, so they are not automated twice; see
 * `tests/landing/landing-rebranding.spec.ts` and the summary.
 *
 * TC-01 is the exception. Its *behaviour* — the nav entries' destinations, the
 * language switcher, the audience toggle — is asserted once on the landing page
 * in SAKANI-41908-06, but the case applies to this page, and nothing had ever
 * checked that the catalogue publishes the same working header. TC-01 below
 * closes that: the shell is asserted where the case says it lives.
 *
 * The rest of the file covers the catalogue's own behaviour: the search box
 * (TC-06), the user-type filters (TC-07), and the global footer with its
 * newsletter (TC-08).
 */
test.describe('SAKANI-42321 - Service catalogue rebranding', () => {
  test(
    'SAKANI-42321-01 - Validate global navigation header on the service catalogue page',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ servicesPage, header, globalSearch, page }) => {
      await servicesPage.open();

      await logStep('Step 01: the catalogue publishes the same global header');
      await header.expectRendered();
      for (const label of HEADER_NAV_LABELS) {
        await expect(header.navItem(label), `nav entry "${label}" on the catalogue`).toBeVisible();
      }
      await expect(header.loginButton).toBeVisible();
      await expect(header.searchButton).toBeVisible();
      // Present here; the switch itself is exercised once, in SAKANI-41908-06,
      // because it can only be observed in a context with no pinned language.
      await expect(header.languageToggle).toBeVisible();

      await logStep('Step 02: the magnifier opens the search modal from the catalogue');
      await header.openGlobalSearch();
      await globalSearch.expectOpen();
      await expect(globalSearch.popularServicesHeading).toBeVisible();

      await globalSearch.close();
      expect(page.url(), 'closing the modal should leave the catalogue where it was').toContain(ROUTES.services);

      /**
       * The catalogue's own user-type chips are the audience control on this page,
       * and SAKANI-42321-07 exercises them in full — they are not re-asserted
       * here. The *header's* audience toggle is the one the case also asks for,
       * and its absence in Arabic is reported by SAKANI-41908-06 (DEF-15).
       */
      await logStep('Step 03: login leads from the catalogue to the login page');
      await servicesPage.open();
      await header.login();

      await page.waitForURL(new RegExp(escapeRegExp(ROUTES.login)), { timeout: 90_000 });
      await expect(page.locator('#username')).toBeVisible({ timeout: 90_000 });
    }
  );

  test('SAKANI-42321-06 - Validate service catalogue search bar inputs', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ servicesPage }) => {
    await servicesPage.open();

    const all = await servicesPage.listedServiceNames();
    expect(all.length, 'the catalogue should list services before anything is typed').toBeGreaterThan(5);

    await logStep('Step 01: an exact service name narrows the catalogue to that service');
    await servicesPage.searchAndSettle(CATALOGUE_SEARCH.exact.term);

    const exactListed = await servicesPage.listedServiceNames();
    expect(exactListed.length).toBeLessThan(all.length);
    expect(await servicesPage.lists(CATALOGUE_SEARCH.exact.expected)).toBe(true);

    await logStep('Step 02: a partial keyword finds the same service');
    await servicesPage.searchAndSettle(CATALOGUE_SEARCH.partial.term);
    expect(await servicesPage.lists(CATALOGUE_SEARCH.partial.expected)).toBe(true);

    await logStep('Step 03: a broader keyword returns several services');
    await servicesPage.searchAndSettle(CATALOGUE_SEARCH.broad.term);
    const broadListed = await servicesPage.listedServiceNames();
    expect(broadListed.length).toBeGreaterThanOrEqual(CATALOGUE_SEARCH.broad.minimumHits);
    for (const name of broadListed) {
      expect(name, `"${name}" was returned for "${CATALOGUE_SEARCH.broad.term}"`).toContain(CATALOGUE_SEARCH.broad.term);
    }

    await logStep('Step 04: surrounding whitespace is ignored');
    await servicesPage.searchAndSettle(CATALOGUE_SEARCH.partial.term);
    const trimmed = await servicesPage.listedServiceNames();

    await servicesPage.searchAndSettle(CATALOGUE_SEARCH.padded);
    expect(await servicesPage.listedServiceNames()).toEqual(trimmed);

    /**
     * The catalogue is published in Arabic only, so upper and lower case have
     * no meaning in the data itself. What can be checked — and what a
     * case-insensitive search actually promises — is that the two forms of the
     * same term are treated identically.
     */
    await logStep('Step 05: the search treats letter case consistently');
    await servicesPage.searchAndSettle(CATALOGUE_SEARCH.latin);
    const lower = await servicesPage.listedServiceNames();

    await servicesPage.searchAndSettle(CATALOGUE_SEARCH.latinUpper);
    expect(await servicesPage.listedServiceNames(), 'the same term in a different case').toEqual(lower);

    await logStep('Step 06: a term that matches nothing shows the empty state');
    await servicesPage.searchAndSettle(CATALOGUE_SEARCH.noMatch);

    expect(await servicesPage.listedServiceNames()).toEqual([]);
    await expect(servicesPage.emptyState).toBeVisible();
    await expect(servicesPage.emptyStateHint, 'the empty state should suggest what to do next').toBeVisible();

    await logStep('Step 07: clearing the field restores the whole catalogue');
    await servicesPage.searchAndSettle(CATALOGUE_SEARCH.partial.term);
    await expect(servicesPage.searchClearButton, 'the field should offer a clear control').toBeVisible();

    await servicesPage.clearSearch();
    await expect(servicesPage.searchInput).toHaveValue('');
    expect(await servicesPage.listedServiceNames()).toEqual(all);
  });

  test('SAKANI-42321-07 - Validate service catalogue filters and combined queries', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ servicesPage }) => {
    await servicesPage.open();

    const all = await servicesPage.listedServiceNames();
    await logStep('Step 01: every user-type filter is offered, none of them active');
    await servicesPage.expectUserTypeFiltersRendered();
    for (const type of SERVICE_USER_TYPES) {
      expect(await servicesPage.isUserTypeSelected(type), `"${type}" should start unselected`).toBe(false);
    }

    let primaryOnly: string[] = [];
    await logStep(`Step 02: a single filter narrows the catalogue to "${CATALOGUE_FILTERS.primary}"`);
    await servicesPage.toggleUserType(CATALOGUE_FILTERS.primary);

    expect(await servicesPage.isUserTypeSelected(CATALOGUE_FILTERS.primary)).toBe(true);
    primaryOnly = await servicesPage.listedServiceNames();
    expect(primaryOnly.length).toBeGreaterThan(0);
    expect(primaryOnly.length).toBeLessThan(all.length);

    await logStep('Step 03: a second filter widens the result rather than narrowing it');
    await servicesPage.toggleUserType(CATALOGUE_FILTERS.secondary);

    expect(await servicesPage.isUserTypeSelected(CATALOGUE_FILTERS.primary)).toBe(true);
    expect(await servicesPage.isUserTypeSelected(CATALOGUE_FILTERS.secondary)).toBe(true);

    const both = await servicesPage.listedServiceNames();
    // Selecting audiences is a union: everything either audience is offered.
    expect(both.length).toBeGreaterThan(primaryOnly.length);
    for (const name of primaryOnly) {
      expect(both, `"${name}" was offered to ${CATALOGUE_FILTERS.primary} alone`).toContain(name);
    }
    expect(await servicesPage.lists(CATALOGUE_FILTERS.secondaryOnlyService), `"${CATALOGUE_FILTERS.secondaryOnlyService}" belongs to ${CATALOGUE_FILTERS.secondary} only`).toBe(true);

    await logStep('Step 04: deselecting both filters restores the catalogue');
    await servicesPage.toggleUserType(CATALOGUE_FILTERS.primary);
    await servicesPage.toggleUserType(CATALOGUE_FILTERS.secondary);

    for (const type of [CATALOGUE_FILTERS.primary, CATALOGUE_FILTERS.secondary]) {
      expect(await servicesPage.isUserTypeSelected(type), `"${type}" should be unselected again`).toBe(false);
    }
    expect(await servicesPage.listedServiceNames()).toEqual(all);

    await logStep('Step 05: a filter and a search term are applied together');
    await servicesPage.toggleUserType(CATALOGUE_FILTERS.primary);
    await servicesPage.searchAndSettle(CATALOGUE_SEARCH.broad.term);

    const combined = await servicesPage.listedServiceNames();
    const filteredOnly = primaryOnly;
    expect(combined.length, 'the term should narrow what the filter offered').toBeLessThanOrEqual(filteredOnly.length);
    for (const name of combined) {
      expect(name).toContain(CATALOGUE_SEARCH.broad.term);
      expect(filteredOnly, `"${name}" should also be offered to ${CATALOGUE_FILTERS.primary}`).toContain(name);
    }

    await logStep('Step 06: criteria that cannot both hold return the empty state');
    await servicesPage.searchAndSettle('');
    await servicesPage.toggleUserType(CATALOGUE_FILTERS.primary);
    await servicesPage.toggleUserType(CATALOGUE_FILTERS.secondary);
    await servicesPage.searchAndSettle(CATALOGUE_FILTERS.conflictingTerm);

    expect(await servicesPage.listedServiceNames()).toEqual([]);
    await expect(servicesPage.emptyState).toBeVisible();
  });

  test('SAKANI-42321-08 - Validate global footer navigation', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ servicesPage, footer, newsletter, page }) => {
    await servicesPage.open();

    await logStep('Step 01: the footer is rendered with every documented destination');
    await footer.expectRendered();
    for (const [key, destination] of Object.entries(footer.destinations)) {
      const link = footer.link(destination.label);
      await expect(link, `footer link "${key}"`).toHaveCount(1);
      await expect(link).toHaveAttribute('href', destination.href);
    }

    await logStep('Step 02: a footer link navigates away from the catalogue');
    await footer.open('reports');
    expect(page.url()).toContain(footer.destinations.reports.href);
  });
});
