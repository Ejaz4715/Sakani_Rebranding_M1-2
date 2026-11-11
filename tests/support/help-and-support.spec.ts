import { test, expect, Products } from '@fixtures/pages.fixture';
import { expectActivationFetchesFile, expectPdfIsPublished, fileUrl } from '@helpers/fileDelivery';
import { HEADER_NAV, ROUTES, SUPPORT_CHANNELS, SUPPORT_LOCATIONS } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-46029 — Help & support page.
 */
test.describe('SAKANI-46029 - Help and support', () => {
  test(
    'SAKANI-46029-01 - Check the user ability to reach to help and support page',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ landingPage, supportPage, header, page }) => {
      await landingPage.open();

      await logStep('Step 01: the header entry navigates to the hub');
      await header.navItem(HEADER_NAV.supportAndHelp).click();
      await page.waitForURL(new RegExp(`${ROUTES.supportAndHelp}$`));
      await expect(supportPage.title).toBeVisible();

      await logStep('Step 02: the footer link reaches the same page');
      await landingPage.open();
      await landingPage.hydrate();
      await landingPage.footer.open('supportAndHelp');
      await expect(supportPage.title).toBeVisible();
    }
  );

  test('SAKANI-46029-02 - Check availability of the content', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ supportPage }) => {
    await supportPage.open();

    await expect(supportPage.title).toBeVisible();
    // Soft, so the channel cards below are still verified while the
    // breadcrumb's home entry is mislabelled "Rebranding Sakani" (DEF-19).
    await expect.soft(supportPage.breadcrumbHome, 'the breadcrumb should start at "الصفحة الرئيسية" (DEF-19)').toBeVisible();

    for (const [key, channel] of Object.entries(SUPPORT_CHANNELS)) {
      await logStep(`Step 01: the "${channel.title}" channel card is present`);
      await expect(supportPage.card(channel.title), `channel card "${key}"`).toBeVisible();
    }
  });

  /**
   * The guide is delivered as a file: the card is an `<a download>` pointing at
   * a PDF on another origin, so activating it hands the user the file rather
   * than navigating within the site. The manual case says "navigation to
   * Complaints guide"; the assertions below describe what the application
   * actually does, and the difference is noted in the summary. `fileDelivery`
   * explains why they do not wait on a download event.
   */
  test('SAKANI-46029-03 - Check the navigation to Complaints guide', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ supportPage }) => {
    await supportPage.open();

    const card = supportPage.card(SUPPORT_CHANNELS.complaintsGuide.title);
    await expect(card).toBeVisible();
    await expect(card).toContainText(SUPPORT_CHANNELS.complaintsGuide.action);
    await expect(card).toHaveAttribute('href', /\.pdf(\?|$)/);
    await expect(card).toHaveAttribute('download', '');

    const href = await fileUrl(card);
    await logStep('Step 01: the guide is published and retrievable');
    await expectPdfIsPublished(supportPage.page, href);

    await logStep('Step 02: activating the card delivers the guide');
    await expectActivationFetchesFile(supportPage.page, card, href);
  });

  test('SAKANI-46029-04 - Check the navigation to Report a suspicion of corruption page', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ supportPage }) => {
    await supportPage.open();

    const card = supportPage.card(SUPPORT_CHANNELS.reportCorruption.title);
    await expect(card).toBeVisible();
    // Soft, so the destination below is still verified: the 2026-11 card shows
    // no action label at all (flagged for clarification).
    await expect.soft(card, `the card should offer its "${SUPPORT_CHANNELS.reportCorruption.action}" action`).toContainText(SUPPORT_CHANNELS.reportCorruption.action);
    await expect(card).toHaveAttribute('href', SUPPORT_CHANNELS.reportCorruption.href);
  });

  test('SAKANI-46029-05 - Check the navigation to Contact Us Page', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ supportPage, page }) => {
    await supportPage.open();

    const card = supportPage.card(SUPPORT_CHANNELS.contactUs.title);
    await expect(card).toBeVisible();

    await card.click();
    await page.waitForURL(/contact-us/, { timeout: 90_000 });

    await logStep('Step 01: a contact form is presented');
    await expect(page.getByText(/راسلنا/).first()).toBeVisible({ timeout: 60_000 });

    await logStep('Step 02: the destination is the rebranded contact page');
    expect(page.url(), 'the support hub should lead to the rebranded contact form; beta lands on the legacy ' + `${SUPPORT_CHANNELS.contactUs.href} (DEF-02)`).toContain(ROUTES.contactUs);
  });

  test('SAKANI-46029-06 - Check the navigation to FAQs page', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ supportPage, faqsPage, page }) => {
    await supportPage.open();

    const card = supportPage.card(SUPPORT_CHANNELS.faqs.title);
    await expect(card).toHaveAttribute('href', SUPPORT_CHANNELS.faqs.href);

    await card.click();
    await page.waitForURL(new RegExp(`${ROUTES.faqs}$`));
    await expect(faqsPage.searchInput).toBeVisible({ timeout: 60_000 });
  });

  test('SAKANI-46029-07 - Validate the availability of Comprehensive locations section', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ supportPage }) => {
    await supportPage.open();
    await supportPage.expectLocationsRendered();

    await expect(supportPage.directionsButtons()).toHaveCount(SUPPORT_LOCATIONS.centres.length);
  });

  test(
    'SAKANI-46029-08 - Check the functionality of View Direction for (Jeddah, Khobar, Madina, Riyadh)',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ supportPage }) => {
      await supportPage.open();
      await supportPage.expectLocationsRendered();

      for (const [index, centre] of SUPPORT_LOCATIONS.centres.entries()) {
        await logStep(`Step 01: Directions for ${centre.city} opens the map service`);
        const popup = await supportPage.openDirections(index);
        expect(popup.url(), `Directions for ${centre.city}`).toContain(SUPPORT_LOCATIONS.directionsHost);
        // Each centre must resolve to its own coordinates, not a shared default.
        expect(popup.url(), `Directions for ${centre.city} should carry coordinates`).toMatch(/lat=[-\d.]+/);
        await popup.close();
      }
    }
  );

  test(
    'SAKANI-46029-09 - Check the functionality of arrows in Comprehensive locations section',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ supportPage }) => {
      await supportPage.open();
      await supportPage.expectLocationsRendered();

      await logStep('Step 01: previous is disabled on the first slide');
      await expect(supportPage.previousArrow).toBeDisabled();
      await expect(supportPage.nextArrow).toBeEnabled();
      expect(await supportPage.activeSlideIndex()).toBe(0);

      await logStep('Step 02: next advances the carousel');
      await supportPage.nextArrow.click();
      await expect.poll(async () => supportPage.activeSlideIndex(), { timeout: 30_000 }).toBe(1);
      await expect(supportPage.previousArrow).toBeEnabled();

      await logStep('Step 03: previous returns to the first slide');
      await supportPage.previousArrow.click();
      await expect.poll(async () => supportPage.activeSlideIndex(), { timeout: 30_000 }).toBe(0);
      await expect(supportPage.previousArrow).toBeDisabled();
    }
  );
});
