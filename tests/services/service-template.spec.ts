import { test, expect, Products } from '@fixtures/pages.fixture';
import { expectPdfIsPublished, fileUrl } from '@helpers/fileDelivery';
import { API, ROUTES, SERVICE_TEMPLATE } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

const { full, editorial } = SERVICE_TEMPLATE;

/**
 * SAKANI-42357 — M1 service template page rebranding.
 *
 * TC-01..TC-04 of this ticket restate the catalogue's footer, search, filters
 * and cards. Those are covered by SAKANI-42321-06/07/08 and SAKANI-46022, so
 * they are not automated again here; see the summary. What is new is the
 * service *detail* page behind a catalogue card, which nothing in the suite had
 * opened before: its tabs, related services, rating control, section templates
 * and navigation.
 */
test.describe('SAKANI-42357 - Service template page', () => {
  test('SAKANI-42357-05 - Validate Service Details tabs functionality', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ serviceTemplatePage }) => {
    await serviceTemplatePage.openService(full.route, full.title);

    await logStep('Step 01: both tabs are offered, the first one selected');
    await expect(serviceTemplatePage.tabs()).toHaveCount(full.tabs.length);
    for (const label of full.tabs) {
      await expect(serviceTemplatePage.tab(label), `tab "${label}"`).toBeVisible();
    }
    expect(await serviceTemplatePage.selectedTab()).toBe(full.tabs[0]);

    const firstPanel = await serviceTemplatePage.tabPanelText();
    expect(firstPanel.length, 'the opening tab should have content').toBeGreaterThan(40);

    await logStep(`Step 02: selecting "${full.tabs[1]}" swaps the content`);
    await serviceTemplatePage.selectTab(full.tabs[1]);

    expect(await serviceTemplatePage.selectedTab()).toBe(full.tabs[1]);
    await expect(serviceTemplatePage.tab(full.tabs[0])).toHaveAttribute('aria-selected', 'false');

    const secondPanel = await serviceTemplatePage.tabPanelText();
    expect(secondPanel.length).toBeGreaterThan(20);
    expect(secondPanel, 'each tab should show its own content').not.toBe(firstPanel);

    await logStep('Step 03: selecting the first tab again restores its content');
    await serviceTemplatePage.selectTab(full.tabs[0]);
    expect(await serviceTemplatePage.selectedTab()).toBe(full.tabs[0]);
    expect(await serviceTemplatePage.tabPanelText()).toBe(firstPanel);
  });

  test('SAKANI-42357-06 - Validate Related Services functionality', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ serviceTemplatePage, page }) => {
    await serviceTemplatePage.openService(full.route, full.title);

    await logStep('Step 01: the related-services band is rendered');
    await serviceTemplatePage.relatedHeading.scrollIntoViewIfNeeded();
    await expect(serviceTemplatePage.relatedHeading).toBeVisible();

    const related = await serviceTemplatePage.relatedServices();

    await logStep('Step 02: it offers services other than the one being viewed');
    expect(related.length, 'at least two related services should be suggested').toBeGreaterThan(1);
    for (const service of related) {
      expect(service.href, `related service "${service.title}" should link somewhere`).toBeTruthy();
      expect(service.title, 'a related service should not be the current page').not.toContain(full.title);
    }

    await logStep('Step 03: "عرض الكل" returns to the full catalogue');
    await expect(serviceTemplatePage.relatedViewAll).toHaveAttribute('href', SERVICE_TEMPLATE.relatedViewAll.href);
    await serviceTemplatePage.relatedViewAll.scrollIntoViewIfNeeded();
    await serviceTemplatePage.relatedViewAll.click();
    await page.waitForURL(new RegExp(`${ROUTES.services}$`), { timeout: 90_000 });

    await logStep('Step 04: a related service card opens that service');
    await serviceTemplatePage.openService(full.route, full.title);
    const first = related[0];

    const card = page.locator(`a[href="${first.href}"]`).first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForURL(new RegExp(`${first.href?.replace(/[/-]/g, '\\$&')}`), { timeout: 90_000 });
  });

  /**
   * The yes/no control posts to `/cms_portal/api/v1/vote_service`, so a run
   * records a real vote against the page — tagged `@submits-data` like the
   * contact-us journeys so a run can exclude it.
   */
  test(
    'SAKANI-42357-07 - Validate Service Rating functionality @submits-data',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ serviceTemplatePage, page }) => {
      const votes: number[] = [];
      page.on('response', (response) => {
        if (response.url().includes(API.voteService)) votes.push(response.status());
      });

      await serviceTemplatePage.openService(full.route, full.title);

      await logStep('Step 01: the page asks whether it was useful');
      await serviceTemplatePage.ratingQuestion.scrollIntoViewIfNeeded();
      await expect(serviceTemplatePage.ratingQuestion).toBeVisible();
      await expect(serviceTemplatePage.ratingYes).toBeVisible();
      await expect(serviceTemplatePage.ratingNo).toBeVisible();
      await expect(serviceTemplatePage.ratingYes).toBeEnabled();

      await logStep('Step 02: the current standing is reported alongside the question');
      const block = await serviceTemplatePage.ratingQuestion.evaluate((node) => {
        let scope: Element = node;
        while (scope.parentElement && scope.getBoundingClientRect().height < 90) scope = scope.parentElement;
        return (scope as HTMLElement).innerText.replace(/\s+/g, ' ').trim();
      });
      expect(block, 'the rating block should report how others voted').toMatch(/%|تعليق/);

      await logStep('Step 03: voting is accepted and recorded');
      await serviceTemplatePage.ratingYes.click();

      await expect.poll(() => votes.length, { message: `a vote should reach ${API.voteService}`, timeout: 45_000 }).toBeGreaterThan(0);
      expect(
        votes.some((status) => status < 400),
        `vote responses: ${votes.join(', ')}`
      ).toBe(true);
    }
  );

  test(
    'SAKANI-42357-08 - Validate Service Details templates and section functionality',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ serviceTemplatePage }) => {
      await logStep('Step 01: the full template carries its details sidebar');
      await serviceTemplatePage.openService(full.route, full.title);
      expect(await serviceTemplatePage.usesFullTemplate()).toBe(true);

      const rows = await serviceTemplatePage.sidebarRows();
      for (const detail of full.details) {
        expect(rows, `sidebar row "${detail.label}"`).toContain(detail.label);
        expect(rows, `value for "${detail.label}"`).toContain(detail.value);
      }

      await logStep('Step 02: the sidebar offers the documented support channels');
      for (const link of full.sidebarLinks) {
        await expect(serviceTemplatePage.sidebarLink(link.label), `sidebar link "${link.label}"`).toHaveAttribute('href', link.href);
      }

      // Read now, fetched last: the guide check is moved to the end so a broken
      // file cannot stop the editorial-template step from being verified.
      const guide = serviceTemplatePage.sidebar.getByRole('link', { name: full.guideDownload.label, exact: true }).first();
      await expect(guide).toHaveAttribute('href', /\.pdf(\?|$)/);
      const guideHref = await fileUrl(guide);

      /**
       * Not every service uses that template. The off-plan product is published
       * from a plain editorial layout with none of the furniture above, which is
       * what "templates and section functionality" turns on: the page object has
       * to recognise which template it is looking at rather than assume one.
       */
      await logStep('Step 04: the editorial template renders sections instead');
      await serviceTemplatePage.openService(editorial.route, editorial.title);
      expect(await serviceTemplatePage.usesFullTemplate()).toBe(false);

      for (const section of editorial.sections) {
        await expect(serviceTemplatePage.heading(section), `section "${section}"`).toBeVisible();
      }
      await expect(serviceTemplatePage.cta(editorial.cta)).toBeVisible();

      await logStep('Step 05: the full template\'s user guide is published and retrievable');
      await expectPdfIsPublished(serviceTemplatePage.page, guideHref);
    }
  );

  test(
    'SAKANI-42357-09 - Validate Service Details navigation and content display',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ serviceTemplatePage, servicesPage, page }) => {
      await logStep('Step 01: a catalogue card opens its service detail page');
      await servicesPage.open();
      const card = servicesPage.serviceLink(full.route);
      await card.scrollIntoViewIfNeeded();
      await card.click();
      await page.waitForURL(new RegExp(`${full.route.replace(/[/-]/g, '\\$&')}$`), { timeout: 90_000 });

      await logStep('Step 02: the page displays the service it was opened for');
      await expect(serviceTemplatePage.heading(full.title)).toBeVisible({ timeout: 60_000 });
      const body = await page.locator('body').innerText();
      expect(body.replace(/\s+/g, ' ').length, 'the detail page should carry content').toBeGreaterThan(400);

      await logStep('Step 03: the breadcrumb reports where the page sits');
      await expect(serviceTemplatePage.breadcrumb).toBeVisible();
      const trail = (await serviceTemplatePage.breadcrumb.innerText()).replace(/\s+/g, ' ').trim();
      // Soft, so the breadcrumb's navigation (Step 04) and the CTA (Step 05) are
      // still verified when a label is wrong.
      for (const crumb of SERVICE_TEMPLATE.breadcrumb) {
        expect.soft(trail, `breadcrumb entry "${crumb}" (the trail reads "${trail}")`).toContain(crumb);
      }
      expect.soft(trail, 'the breadcrumb should name the current service').toContain(full.title);

      await logStep('Step 04: the breadcrumb navigates back to the catalogue');
      await serviceTemplatePage.breadcrumb.getByText(SERVICE_TEMPLATE.breadcrumb[1], { exact: true }).first().click();
      await page.waitForURL(new RegExp(`${ROUTES.services}$`), { timeout: 90_000 });
      await expect(servicesPage.title).toBeVisible({ timeout: 60_000 });

      await logStep('Step 05: the service offers its call to action');
      await serviceTemplatePage.openService(full.route, full.title);
      await expect(serviceTemplatePage.startService).toBeVisible();
      await expect(serviceTemplatePage.startService).toHaveAttribute('href', full.startCta.href);
      await expect(serviceTemplatePage.cta(full.favouriteCta)).toBeVisible();
    }
  );
});
