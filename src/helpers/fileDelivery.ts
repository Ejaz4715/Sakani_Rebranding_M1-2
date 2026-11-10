import { Locator, Page, expect } from '@playwright/test';

/**
 * Assertions for the "preview" controls that hand the user a PDF.
 *
 * Both the report cards (SAKANI-46375-03) and the complaints guide card
 * (SAKANI-46029-03) are `<a download href="https://ruh-s3.bluvalt.com/…pdf">`.
 *
 * Waiting on `page.waitForEvent('download')` is not a sound way to check them.
 * The files are served from a different origin, and the HTML `download`
 * attribute is ignored cross-origin, so the browser is free to navigate to the
 * file instead of saving it — and which one happens depends on how the browser
 * was launched. Headless Chromium has no PDF viewer and falls back to a
 * download; headed Chromium renders the file in its built-in viewer and never
 * raises a download event. That is why both of those cases passed headless and
 * timed out after 30s in the headed run of 2026-08-30.
 *
 * The helpers below assert what the manual cases actually mean — the control
 * points at a real, retrievable file, and activating it fetches that file —
 * without depending on which of the two routes the browser takes.
 */

/** The `href` of a control that must expose one. */
export async function fileUrl(link: Locator): Promise<string> {
  const href = await link.getAttribute('href');
  expect(href, 'the control should carry a file URL').toBeTruthy();
  return href as string;
}

/**
 * Fetch the linked file and assert it is a real PDF.
 *
 * Only the first kilobyte is requested: the reports run to ~12 MB each and the
 * PDF magic number is all that is needed to tell a published file from a 403 or
 * an HTML error page. A server that ignores `Range` answers 200 with the whole
 * body, which the assertions handle just the same.
 */
export async function expectPdfIsPublished(page: Page, href: string): Promise<void> {
  const response = await page.request.get(href, {
    headers: { Range: 'bytes=0-1023' },
    timeout: 90_000,
  });

  expect([200, 206], `GET ${href} returned ${response.status()}`).toContain(response.status());
  expect(response.headers()['content-type'] ?? '').toContain('application/pdf');
  expect((await response.body()).subarray(0, 5).toString('latin1'), 'the file should start with the PDF magic number').toContain(
    '%PDF',
  );
}

/**
 * Click the control and assert the browser goes after the file.
 *
 * Accepts either outcome — a download starting, or a request for the file being
 * issued as the browser navigates to it — so the check means the same thing
 * headed and headless.
 */
export async function expectActivationFetchesFile(page: Page, link: Locator, href: string): Promise<void> {
  const activations: string[] = [];
  const onDownload = () => activations.push('download');
  const onRequest = (request: { url(): string }) => {
    if (request.url() === href) activations.push('request');
  };

  page.on('download', onDownload);
  page.on('request', onRequest);
  try {
    await link.click();
    await expect
      .poll(() => activations.length, {
        message: `activating the control should download ${href} or navigate to it`,
        timeout: 45_000,
      })
      .toBeGreaterThan(0);
  } finally {
    page.off('download', onDownload);
    page.off('request', onRequest);
  }
}
