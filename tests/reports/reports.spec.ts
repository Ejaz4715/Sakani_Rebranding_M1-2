import { test, expect, Products } from '@fixtures/pages.fixture';
import { expectActivationFetchesFile, expectPdfIsPublished, fileUrl } from '@helpers/fileDelivery';
import { REPORT_CARD, REPORT_SORT, REPORT_TABS } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-46375 — Reports page.
 *
 * The manual suite also carries a "Check the business logic with PO" item.
 * That is a discussion, not an executable check, so it is reported as
 * not-automatable rather than turned into an invented assertion — see the
 * summary. What it most likely refers to is captured by SAKANI-46375-04 below,
 * which is where the application and the manual expectation diverge.
 */
test.describe('SAKANI-46375 - Reports', () => {
  test(
    'SAKANI-46375-01 - Check the user ability to reach the reports (Sakani Reports, Residential Outreach, Residential Program Book)',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ reportsPage }) => {
      await reportsPage.open();
      await expect(reportsPage.listingHeading).toBeVisible();

      for (const [key, label] of Object.entries(REPORT_TABS)) {
        await logStep(`Step 01: the "${label}" category is reachable`);
        await expect(reportsPage.tab(label), `tab "${label}" (${key})`).toBeVisible();
        await reportsPage.openTab(label);
        expect(await reportsPage.reportCount(), `"${label}" should list at least one report`).toBeGreaterThan(0);
      }
    }
  );

  test('SAKANI-46375-02 - Check the functionality of all the sorting and clear', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ reportsPage }) => {
    await reportsPage.open();
    await reportsPage.openTab(REPORT_TABS.sakaniReports);

    const unsorted = await reportsPage.listedReportTitles();
    expect(unsorted.length).toBeGreaterThan(1);

    await logStep('Step 01: the sort panel offers all three option groups');
    await reportsPage.sort.open();
    for (const group of Object.values(REPORT_SORT.groups)) {
      await expect(reportsPage.sort.groupLabel(group.label)).toBeVisible();
      for (const option of group.options) {
        await expect(reportsPage.sort.option(option)).toBeVisible();
      }
    }
    await expect(reportsPage.sort.applyButton).toBeVisible();
    await expect(reportsPage.sort.clearAllButton).toBeVisible();

    await logStep('Step 02: applying "oldest first" reorders the listing and badges the trigger');
    await reportsPage.sort.select('الأقدم');
    expect(await reportsPage.sort.isSelected('الأقدم')).toBe(true);
    await reportsPage.sort.apply();
    await reportsPage.waitForListingToSettle();

    expect(await reportsPage.sort.appliedCount()).toBe(1);
    const sorted = await reportsPage.listedReportTitles();
    expect(sorted, 'the listing should change when a sort is applied').not.toEqual(unsorted);

    await logStep('Step 03: applying "newest first" reverses that order');
    await reportsPage.sort.open();
    await reportsPage.sort.select('الأحدث');
    await reportsPage.sort.apply();
    await reportsPage.waitForListingToSettle();

    const newestFirst = await reportsPage.listedReportTitles();
    expect(newestFirst.length).toBeGreaterThan(0);
    expect(await reportsPage.sort.appliedCount()).toBe(1);

    await logStep('Step 04: "clear all" drops every selection and the applied badge');
    await reportsPage.sort.open();
    await reportsPage.sort.clearAll();
    await reportsPage.waitForListingToSettle();

    expect(await reportsPage.sort.appliedCount()).toBe(0);
    await reportsPage.sort.open();
    expect(await reportsPage.sort.selectedOptions()).toEqual([]);
  });

  /**
   * The control is an `<a download>` pointing at a file on another origin, so
   * "preview" hands the user the PDF rather than rendering it in the page. That
   * difference from the manual wording is recorded in the summary; the
   * assertions below describe what the application actually does, and
   * `fileDelivery` explains why they do not wait on a download event.
   */
  test('SAKANI-46375-03 - Check the user ability to preview the report', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ reportsPage }) => {
    await reportsPage.open();
    await reportsPage.openTab(REPORT_TABS.sakaniReports);

    const preview = reportsPage.previewLinks().first();
    await expect(preview, 'at least one published report should offer a preview').toBeVisible();
    const href = await fileUrl(preview);

    await logStep('Step 01: the control points at a published PDF');
    await expect(preview).toHaveAttribute('href', /\.pdf(\?|$)/);
    await expect(preview).toHaveAttribute('download', '');

    await logStep('Step 02: reports with no published file offer a disabled "coming soon" control');
    const comingSoon = reportsPage.comingSoonButtons().first();
    if (await comingSoon.isVisible().catch(() => false)) {
      await expect(comingSoon).toBeDisabled();
    }

    await logStep('Step 03: the report file is published and retrievable');
    await expectPdfIsPublished(reportsPage.page, href);

    // Last: activating the control can take the browser to the file, which
    // leaves nothing on the reports page for a later step to assert against.
    await logStep('Step 04: activating it delivers the report file');
    await expectActivationFetchesFile(reportsPage.page, preview, href);
  });

  /**
   * The preview control renders the raw i18n key instead of a translated label.
   * The assertion states the intended behaviour and is expected to fail while
   * the defect is open (DEF-05).
   */
  test('SAKANI-46375-06 - The report preview control is translated', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ reportsPage }) => {
    await reportsPage.open();
    await reportsPage.openTab(REPORT_TABS.sakaniReports);

    const preview = reportsPage.previewLinks().first();
    await expect(preview).toBeVisible();
    await expect(preview, `the preview control renders the raw translation key "${REPORT_CARD.previewKey}" instead of a ` + 'translated label (DEF-05)').not.toHaveText(REPORT_CARD.previewKey);
  });

  /**
   * The manual expectation is that at most one sort option can be active.
   * Beta enforces that only *within* a group: picking "الأقدم" replaces
   * "الأحدث", but an option from another group can be selected at the same
   * time, leaving two active. The assertion states the manual expectation and
   * is expected to fail while the defect is open (DEF-06).
   */
  test(
    'SAKANI-46375-04 - Check the user should not be able to select more than 1 sort option',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ reportsPage }) => {
      await reportsPage.open();
      await reportsPage.openTab(REPORT_TABS.sakaniReports);
      await reportsPage.sort.open();

      await logStep('Step 01: within a group the selection is exclusive');
      await reportsPage.sort.select('الأحدث');
      expect(await reportsPage.sort.selectedOptions()).toEqual(['الأحدث']);

      await reportsPage.sort.select('الأقدم');
      expect(await reportsPage.sort.selectedOptions()).toEqual(['الأقدم']);

      await logStep('Step 02: across groups only one option should remain selected');
      await reportsPage.sort.select('تنازلي');
      const selected = await reportsPage.sort.selectedOptions();
      expect(selected, 'selecting an option from a second group should replace the first; beta keeps both ' + `selected (got ${JSON.stringify(selected)}) (DEF-06)`).toHaveLength(1);
    }
  );

  test('SAKANI-46375-05 - Reports pagination', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ reportsPage }) => {
    await reportsPage.open();
    await reportsPage.openTab(REPORT_TABS.sakaniReports);
    await reportsPage.pagination.expectRendered();

    const firstPage = await reportsPage.listedReportTitles();
    await reportsPage.pagination.goToPage(2);

    await expect.poll(async () => (await reportsPage.listedReportTitles()).join('|'), { timeout: 45_000 }).not.toBe(firstPage.join('|'));
  });
});
