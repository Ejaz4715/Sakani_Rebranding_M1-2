import { test, expect, Products } from '@fixtures/pages.fixture';
import { HeroSlide, LandingPage } from '@pages/LandingPage';
import { Header } from '@components/Header';
import { escapeRegExp } from '@pages/BasePage';
import { seedBrowserState } from '@helpers/browserState';
import {
  FOOTER_LINKS,
  APP_DOWNLOAD,
  HEADER_NAV_DESTINATIONS,
  HEADER_NAV_LABELS,
  HEADER_NAV_LABELS_EN,
  HEADER_USER_TYPES,
  HERO_CAROUSEL,
  HERO_VIDEO,
  LANDING_METRICS,
  LANDING_PRODUCTS,
  LANDING_SCENARIOS,
  LANDING_SEARCH,
  NEWSLETTER,
  PARTNER_LOGOS,
  ROUTES,
} from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-41908 — M1 landing page rebranding.
 *
 * SAKANI-46026 already covers the login button, the hero search bar and the
 * cookie banner; this describe picks up the six areas the rebranding ticket
 * adds and does not repeat them. SAKANI-42321 TC-01..TC-05 restate these same
 * six areas for the catalogue page — they are the same page furniture, so the
 * behaviour is covered here once rather than twice, and SAKANI-42321-01 checks
 * that the catalogue really publishes the same working header (see the summary).
 */
test.describe('SAKANI-41908 - Landing page rebranding', () => {
  test('SAKANI-41908-01 - Validate Hero Video Toggle and Buy/Rent Search Interactions', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ landingPage, page }) => {
    // A cold landing page, a ranged fetch of the promo file and a second tab,
    // on top of the search-bar interactions. The default 180s does not cover it.
    test.setTimeout(300_000);

    await landingPage.open();

    /**
     * The hero banner, as SAKANI-42321 TC-02 describes it ("hero banner
     * promotional content"). Asserted structurally — every slide carries a
     * title, a description and a call to action — because beta serves editorial
     * placeholders in several slides ("Test Main Banner", "test"), and pinning
     * that copy would fail on the day real content lands.
     */
    await logStep('Step 01: the hero banner presents promotional content');
    await expect(landingPage.heroDots().first()).toBeVisible({ timeout: 60_000 });
    const dots = await landingPage.heroDots().count();
    expect(dots, 'the hero should publish a carousel of promotional slides').toBeGreaterThanOrEqual(HERO_CAROUSEL.minimumSlides);

    expect(await landingPage.activeSlide(), 'the carousel should have a live slide').not.toBeNull();

    // Every published slide, not only the one on screen: the carousel rotates,
    // so judging the active slide alone made the verdict depend on timing.
    // Soft, so the remaining hero steps still run and report.
    const slides: HeroSlide[] = await landingPage.allSlides();
    expect(slides.length, 'the hero should publish its slides').toBeGreaterThanOrEqual(HERO_CAROUSEL.minimumSlides);
    for (const [index, slide] of slides.entries()) {
      const name = `slide ${index + 1} ("${slide.title || slide.ctas[0] || '?'}")`;
      expect.soft(slide.title.length, `${name} should carry a title`).toBeGreaterThan(0);
      expect.soft(slide.description.length, `${name} should carry a description`).toBeGreaterThan(0);
      expect.soft(slide.ctas, `${name} should offer a call to action`).not.toEqual([]);
    }

    /**
     * The dots, on `aria-current` rather than on the copy they reveal: the
     * carousel advances by itself, so a copy comparison would pass or fail on
     * timing. Which dot is current is exact at the moment it is read.
     */
    await logStep('Step 02: the pagination dots move the carousel');
    const second = HERO_CAROUSEL.slideLabel(2);
    await landingPage.heroDot(2).click();
    await expect.poll(async () => landingPage.currentSlideLabel(), { timeout: 30_000 }).toBe(second);

    await logStep('Step 03: the brand promo offers a published video file');
    await expect(landingPage.videoCta, `hero promo "${HERO_VIDEO.cta}"`).toBeVisible({ timeout: 60_000 });
    await expect(landingPage.videoCta).toHaveAttribute('href', HERO_VIDEO.filePattern);
    await expect(landingPage.videoCta).toHaveAttribute('target', '_blank');

    // Only the first kilobyte: the promo is a full-length mp4, and all the
    // assertion needs is that the file is really published.
    const href = await landingPage.videoCta.getAttribute('href');
    const response = await page.request.get(href as string, {
      headers: { Range: 'bytes=0-1023' },
      timeout: 90_000,
    });
    expect([200, 206], `GET ${href} returned ${response.status()}`).toContain(response.status());
    expect(response.headers()['content-type'] ?? '').toContain('video');

    await logStep('Step 04: the search bar opens on "شراء" and offers both purposes');
    await landingPage.expectSearchBarRendered();
    expect(await landingPage.selectedSearchTab()).toBe(LANDING_SEARCH.buyTab);

    await logStep('Step 05: switching to "إيجار" moves the selection');
    await landingPage.selectSearchTab(landingPage.rentTab);
    expect(await landingPage.selectedSearchTab()).toBe(LANDING_SEARCH.rentTab);
    await expect(landingPage.buyTab).toHaveAttribute('aria-selected', 'false');
    // The bar stays usable on the other purpose.
    await expect(landingPage.cityInput).toBeVisible();
    await expect(landingPage.exploreButton).toBeEnabled();

    await logStep('Step 06: and back to "شراء"');
    await landingPage.selectSearchTab(landingPage.buyTab);
    expect(await landingPage.selectedSearchTab()).toBe(LANDING_SEARCH.buyTab);
    await landingPage.searchCity('الرياض');
    await expect(landingPage.cityInput).toHaveValue('الرياض');

    /**
     * Restored 2026-11-11. The case asks for a hero *video toggle* and
     * SAKANI-42321 TC-02 for a "brand video modal display"; this check had been
     * removed, so the missing feature stopped being reported. Activating the
     * promo has to present the video on the page — an in-page player or a
     * dialog. Last in the test so every step above still reports (DEF-14).
     */
    await logStep('Step 07: activating the brand promo presents the video in a player or modal');
    const promoTab = await landingPage.activatePromo();
    const players = await landingPage.playerCount();
    const dialogs = await landingPage.openDialogs();
    const promoTabUrl = promoTab?.url() ?? 'no new tab';
    await promoTab?.close();
    expect(
      players + dialogs.length,
      'the hero should toggle the brand video in an in-page player or modal; activating it opened ' + `${promoTabUrl} instead, with ${players} <video> element(s) and no dialog on the page (DEF-14)`
    ).toBeGreaterThan(0);
  });

  test('SAKANI-41908-02 - Validate Product Cards & Partner Logo Redirections', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ landingPage, page }) => {
    await landingPage.openFully();

    await logStep('Step 01: the three product cards are offered');
    await landingPage.expectProductsRendered();
    expect(LANDING_PRODUCTS.length).toBe(3);

    await logStep('Step 02: each card hands off to the marketplace, pre-filtered');
    for (const product of LANDING_PRODUCTS) {
      await expect(landingPage.productCard(product.href), `"${product.title}"`).toHaveAttribute('href', product.href);
    }

    /**
     * Every card, not just the first: each one carries its own marketplace
     * query, and a wiring mistake would only show on the card that has it.
     *
     * They carry `target="_blank"`, so the marketplace opens in a second tab
     * and the landing page stays where it is — waiting on the current page for
     * that navigation would never return.
     */
    for (const product of LANDING_PRODUCTS) {
      await logStep(`Step 03: activating "${product.title}" opens its marketplace query`);
      const card = landingPage.productCard(product.href);
      await expect(card).toHaveAttribute('target', '_blank');
      await card.scrollIntoViewIfNeeded();

      const [marketplace] = await Promise.all([page.context().waitForEvent('page'), card.click()]);
      await marketplace.waitForLoadState('domcontentloaded').catch(() => undefined);

      const query = product.href.slice(product.href.indexOf('?') + 1);
      expect(marketplace.url(), `"${product.title}" should open ${product.href}`).toContain('/app/marketplace');
      for (const parameter of query.split('&')) {
        expect(marketplace.url(), `"${product.title}" should carry ${parameter}`).toContain(parameter);
      }
      await marketplace.close();
    }

    await logStep('Step 04: the developer logo strip is rendered');
    await expect(landingPage.partnerLogos()).toHaveCount(PARTNER_LOGOS.expectedCount);
    await expect(page.getByText(PARTNER_LOGOS.sectionText, { exact: false }).first()).toBeVisible();

    /**
     * The manual case expects the partner logos to redirect. On beta every one
     * of them is a bare `<img>` with no anchor around it, so there is nothing
     * to activate. The assertion states the expectation and is expected to fail
     * while the defect is open (DEF-10).
     */
    await logStep('Step 05: each partner logo links to its partner');
    const targets = await landingPage.partnerLogoTargets();
    const inert = targets.filter((logo) => !logo.href).map((logo) => logo.src);
    expect(inert, `every partner logo should carry a destination; on beta ${inert.length} of ${targets.length} are ` + 'plain images with no link around them (DEF-10)').toEqual([]);
  });

  test(
    'SAKANI-41908-03 - Validate Scenario Cards, Title Enhancements & Link Redirections',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ landingPage, page }) => {
      await landingPage.openFully();

      await logStep('Step 01: the section carries its enhanced title');
      await expect(page.getByText(LANDING_SCENARIOS.sectionHeading).first()).toBeVisible();

      await logStep('Step 02: all three customer scenarios are presented');
      for (const card of LANDING_SCENARIOS.cards) {
        await expect(landingPage.scenarioCard(card), `scenario card "${card}"`).toBeVisible();
      }

      const targets = await landingPage.scenarioLinkTargets();

      await logStep('Step 03: every documented scenario CTA is rendered');
      const rendered = new Set(targets.map((link) => link.text));
      const missing = LANDING_SCENARIOS.links.filter((label) => !rendered.has(label));
      expect(missing, 'scenario CTAs present in the baseline but absent from the page').toEqual([]);

      /**
       * The manual case asks for the redirections behind those CTAs. Every one of
       * them is published with `href="#"`, so none of them goes anywhere. The
       * assertion states the expectation and is expected to fail while the defect
       * is open (DEF-11).
       */
      await logStep('Step 04: each scenario CTA leads somewhere');
      const dead = targets.filter((link) => !link.href || link.href === '#').map((link) => link.text);
      expect(dead, `every scenario CTA should carry a destination; on beta ${dead.length} of ${targets.length} are ` + 'published as href="#" and navigate nowhere (DEF-11)').toEqual([]);
    }
  );

  test('SAKANI-41908-04 - Validate Mobile App Download Promotion & Feature Links', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ landingPage }) => {
    await landingPage.openFully();

    await logStep('Step 01: the key metrics band reports all three figures');
    const metrics = await landingPage.metrics();
    expect(metrics.map((metric) => metric.caption)).toEqual([...LANDING_METRICS.captions]);

    for (const metric of metrics) {
      // The figures count up as the band scrolls into view, so only their
      // shape is stable — two reads a minute apart gave different numbers.
      expect(metric.value, `metric "${metric.caption}" should report a figure`).toMatch(LANDING_METRICS.valuePattern);
    }

    await logStep('Step 02: the app promotion offers both stores and a QR code');
    const appStore = landingPage.storeLink('appStore');
    const googlePlay = landingPage.storeLink('googlePlay');

    await expect(appStore).toBeVisible();
    await expect(appStore).toHaveAttribute('href', new RegExp(APP_DOWNLOAD.appStore.hrefContains));
    await expect(googlePlay).toBeVisible();
    await expect(googlePlay).toHaveAttribute('href', new RegExp(APP_DOWNLOAD.googlePlay.hrefContains));
    await expect(landingPage.qrCode).toBeVisible();
  });

  /**
   * Creates a real subscription in the beta newsletter list, so it is tagged
   * `@submits-data` alongside the contact-us journeys and uses the same
   * QA-labelled address.
   */
  test(
    'SAKANI-41908-05 - Validate Newsletter Email Capture, Storage & Automated Dispatch @submits-data',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ landingPage, newsletter, page }) => {
      await landingPage.openFully();

      await logStep('Step 01: the capture is offered in the global footer');
      await newsletter.expectRendered();
      expect(await newsletter.isInFooter(), 'the newsletter block belongs to the global footer').toBe(true);

      await logStep('Step 02: an ill-formed address is rejected before anything is sent');
      await newsletter.enter(NEWSLETTER.invalidEmail);
      await newsletter.submit();
      await expect.poll(async () => newsletter.validationMessage(), { timeout: 30_000 }).not.toBe('');
      expect(await newsletter.currentValue()).toBe(NEWSLETTER.invalidEmail);

      /*
       * Record every exchange the page makes while the valid address is
       * submitted, so "storage and dispatch" can be judged on where the address
       * actually went and on what answered — telemetry carrying it in a payload
       * is not a subscription, and a request nothing acknowledges is not storage.
       */
      // Restored 2026-11-11: this capture and the verdict below had been
      // commented out, which silently stopped DEF-12 from being reported.
      const carryingEmail: Array<{ line: string; url: string; status?: number }> = [];
      page.on('request', (request) => {
        const payload = `${request.url()} ${request.postData() ?? ''}`;
        if (payload.includes(NEWSLETTER.email)) {
          carryingEmail.push({ line: `${request.method()} ${request.url()}`, url: request.url() });
        }
      });
      page.on('response', (response) => {
        for (const entry of carryingEmail) {
          if (entry.url === response.url() && entry.status === undefined) entry.status = response.status();
        }
      });

      await logStep('Step 03: a valid address is accepted and confirmed');
      await newsletter.enter(NEWSLETTER.email);
      await newsletter.submit();

      await expect(newsletter.successToast, 'the subscription should be confirmed on screen').toBeVisible({
        timeout: 45_000,
      });
      await expect.poll(async () => newsletter.currentValue(), { timeout: 30_000 }).toBe('');

      /**
       * The manual case is about capture, storage *and* automated dispatch, so
       * the address has to reach a Sakani endpoint that could do either, and that
       * endpoint has to accept it. Third-party telemetry that happens to carry the
       * field value is not a subscription, which is why the analytics and
       * tag-manager beacons are excluded before the verdict.
       *
       * What cannot be proven from the browser is the dispatch itself — no
       * mailbox is available to this suite — so the assertion stops at the last
       * observable point: a Sakani backend acknowledged the address. Anything
       * beyond that needs a mail or back-office check and is called out as such.
       */
      await test.step('Step 04: the subscription reaches a Sakani backend that accepts it', async () => {
        const subscription = carryingEmail.filter((entry) => !NEWSLETTER.telemetryPattern.test(entry.line));
        const seen = carryingEmail.length ? carryingEmail.map((entry) => `${entry.line} -> ${entry.status ?? 'no response'}`).join(' | ') : 'none';

        expect(
          subscription.map((entry) => entry.line),
          'subscribing should send the address to a backend that can store it and dispatch the newsletter. ' + `Requests seen carrying it: ${seen} (DEF-12)`
        ).not.toEqual([]);

        const accepted = subscription.filter((entry) => entry.status !== undefined && entry.status < 400);
        expect(accepted.map((entry) => `${entry.line} -> ${entry.status}`), `the backend should acknowledge the subscription. Seen: ${seen} (DEF-12)`).not.toEqual([]);
      });
    }
  );

  /**
   * Every link the global footer publishes, not just the seven other journeys
   * navigate through.
   *
   * Internal destinations are followed in the browser, which is what
   * "redirection" means for the pages Sakani owns. The third-party ones —
   * social networks, the regulator's index, the metaverse host — are asserted
   * on their `href` and `target` instead of being opened: those are the only
   * parts of the redirection this application controls, and driving a test
   * through facebook.com would measure their uptime rather than this footer.
   */
  test('SAKANI-41908-07 - Validate redirection of ALL footer links', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ landingPage, footer, page }) => {
    // Eight in-browser navigations on a slow environment, each from a freshly
    // hydrated landing page.
    test.setTimeout(600_000);

    await landingPage.openFully();

    await logStep('Step 01: the footer publishes every documented link and nothing else');
    await footer.expectRendered();

    const rendered = await footer.hrefs();
    expect(rendered.length, 'the footer should carry every documented link').toBeGreaterThanOrEqual(FOOTER_LINKS.length);

    // Soft: every link is judged in one run instead of the first mismatch hiding
    // the other nineteen. The test still fails if any of them is wrong.
    for (const entry of FOOTER_LINKS) {
      const name = entry.label ?? entry.alt;
      const link = footer.linkFor(entry);
      await expect.soft(link, `footer link "${name}"`).toHaveCount(1);

      if (entry.href) {
        await expect.soft(link, `destination of "${name}"`).toHaveAttribute('href', entry.href);
      } else {
        await expect.soft(link, `destination of "${name}"`).toHaveAttribute('href', new RegExp(escapeRegExp(entry.hrefContains as string)));
      }
    }

    await logStep('Step 02: the links that leave the site say so');
    for (const entry of FOOTER_LINKS.filter((link) => link.newTab)) {
      await expect.soft(footer.linkFor(entry), `"${entry.label ?? entry.alt}" should open a new tab`).toHaveAttribute('target', '_blank');
    }

    for (const entry of FOOTER_LINKS.filter((link) => !link.external)) {
      await logStep(`Step 03: "${entry.label}" opens ${entry.href}`);
      await landingPage.openFully();

      const link = footer.linkFor(entry);
      await link.scrollIntoViewIfNeeded();
      await link.click();

      // `commit`: the marketplace and the legacy rental-units page are heavy
      // applications that keep loading well after the route is taken.
      // The wait only paces the step; the verdict is the assertion below, so a
      // link that goes somewhere else is reported by name rather than as a
      // bare timeout.
      await page
        .waitForURL(new RegExp(`${escapeRegExp(entry.href as string)}([?#]|$)`), { waitUntil: 'commit', timeout: 60_000 })
        .catch(() => undefined);
      expect.soft(new URL(page.url()).pathname, `"${entry.label}" should reach ${entry.href}; it reached ${page.url()}`).toBe(new URL(entry.href as string, page.url()).pathname);
    }
  });

  test(
    'SAKANI-41908-06 - Validate Navigation Bar Elements, Toggle & Search Modal Interaction',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ landingPage, header, globalSearch, browser, page }) => {
      // Five landing-page loads and three marketplace navigations, each from a
      // freshly hydrated page, plus the language check in its own context.
      test.setTimeout(600_000);

      /** Recorded in the English context, reported by the Arabic assertion. */
      let englishAudience: string[] = [];

      await landingPage.open();

      await logStep('Step 01: the navigation bar renders every element');
      await header.expectRendered();
      for (const label of HEADER_NAV_LABELS) {
        await expect(header.navItem(label), `nav entry "${label}"`).toBeVisible();
      }
      await expect(header.loginButton).toBeVisible();
      await expect(header.searchButton).toBeVisible();
      await expect(header.languageToggle).toBeVisible();

      /**
       * Where the entries actually lead — SAKANI-42321 TC-01 asks for the header
       * *links*, not merely for their presence.
       *
       * Two of the five are already followed elsewhere and are not repeated here:
       * "الخدمات" opens the catalogue in SAKANI-46022-01, and "الدعم والمساعدة"
       * the support hub in SAKANI-46029-01. The three below were never activated
       * by anything until now.
       *
       * The property entries carry `aria-haspopup` and go nowhere when clicked —
       * clicking one only toggles its active style — so for those the redirection
       * belongs to the panel item, which is where it is asserted.
       */
      for (const destination of HEADER_NAV_DESTINATIONS) {
        await logStep(`Step 02: "${destination.label}" leads to ${destination.follow.href}`);
        await landingPage.open();

        if (destination.items) {
          const entry = header.navItem(destination.label);
          await expect(entry, `"${destination.label}" should open a panel`).toHaveAttribute('aria-haspopup', 'true');

          await entry.hover();
          for (const item of destination.items) {
            await expect(header.megaMenuItem(item), `panel item "${item}"`).toBeVisible({ timeout: 30_000 });
          }

          await header.openMegaMenuItem(destination.label, destination.follow.item as string);
        } else {
          await header.navItem(destination.label).click();
        }

        // `commit`: the marketplace keeps loading well after the route is taken.
        await page.waitForURL(new RegExp(escapeRegExp(destination.follow.href)), {
          waitUntil: 'commit',
          timeout: 90_000,
        });
        expect(page.url()).toContain(destination.follow.href);
      }

      await logStep('Step 03: the magnifier opens the search modal');
      // Back to the landing page: the redirection steps above deliberately
      // leave the browser on the marketplace they navigated to.
      await landingPage.open();
      const landingUrl = page.url();

      await header.openGlobalSearch();
      await globalSearch.expectOpen();
      // Soft: the 2026-11 release dropped the "most common services" suggestions
      // from the empty overlay (flagged for clarification); it must not stop the
      // close, Escape, language and audience checks below from running.
      await expect.soft(globalSearch.popularServicesHeading, 'the empty overlay should suggest the most common services').toBeVisible();

      await logStep('Step 04: its close button dismisses it');
      await expect(globalSearch.closeButton, 'the overlay should offer a close control').toBeVisible();
      await globalSearch.close();

      await expect(header.logo).toBeVisible();
      // Compared with the URL the landing page was opened on, rather than a
      // hard-coded slug: the landing page moved from `/rebranding-sakani` to `/`.
      expect(page.url(), 'closing the modal should leave the page where it was').toBe(landingUrl);

      await logStep('Step 05: and so does Escape, once it is open again');
      await header.openGlobalSearch();
      await globalSearch.expectOpen();

      await page.keyboard.press('Escape');
      await expect(globalSearch.input).toBeHidden({ timeout: 30_000 });

      /**
       * In its own context, with the language preference left alone.
       *
       * Every other journey pins `localStorage.language` before each navigation
       * so the suite always gets the same UI, but that seed runs again on the
       * reload the toggle triggers and puts the pinned language straight back —
       * the toggle can only be observed where nothing is pinning it.
       */
      await logStep('Step 06: the language toggle switches the navigation to English');
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        locale: 'ar-SA',
        ignoreHTTPSErrors: true,
      });
      try {
        const unpinned = await context.newPage();
        await seedBrowserState(unpinned, { language: null });

        const landing = new LandingPage(unpinned);
        const unpinnedHeader = new Header(unpinned);
        await landing.open();

        await expect(unpinnedHeader.navItem(HEADER_NAV_LABELS[0])).toBeVisible({ timeout: 60_000 });
        await unpinnedHeader.switchLanguage();

        for (const label of HEADER_NAV_LABELS_EN) {
          await expect(unpinnedHeader.navItem(label), `English nav entry "${label}"`).toBeVisible({ timeout: 60_000 });
        }

        /*
         * While an English header is on screen: this is where the audience
         * toggle the case calls "user type toggles" is published, and having it
         * on record here is what makes the Arabic assertion below a defect
         * rather than a guess about a control nobody has seen.
         */
        englishAudience = await unpinnedHeader.audienceControls();
        expect(englishAudience, 'the English header should offer the audience toggle').toEqual([...HEADER_USER_TYPES.english]);
      } finally {
        await context.close();
      }

      /**
       * The audience toggle, in the language the suite runs in.
       *
       * The English header publishes "Individual" / "Business" — asserted in the
       * step above — but the Arabic header renders no equivalent control under any
       * label: its entire complement is the five nav entries, the language toggle
       * and login. Asserted rather than described, so the gap is visible on every
       * run (DEF-15), and last in the test so it never stops the rest running.
       */
      await logStep('Step 07: the Arabic header offers the same user-type toggle');
      await landingPage.open();
      const audience = await header.audienceControls();

      // At least as many audiences as the English header offers, rather than
      // exactly that many: the count is the product's to choose, and pinning it
      // would fail the day a third audience is added.
      expect(
        audience.length,
        'the case lists user-type toggles in the global header. The English header offers ' +
          `"${englishAudience.join('" / "')}", but the Arabic header publishes no audience control at all — it ` +
          `renders only ${HEADER_NAV_LABELS.length} nav entries, the language toggle and login (DEF-15)`
      ).toBeGreaterThanOrEqual(HEADER_USER_TYPES.english.length);
    }
  );
});
