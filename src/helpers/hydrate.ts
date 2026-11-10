import { Page } from '@playwright/test';

/**
 * Walk a page top-to-bottom so every lazily-hydrated section exists.
 *
 * The rebranded pages drive their sections with Locomotive Scroll: a block
 * below the fold is not merely off-screen, it is not rendered at all until it
 * has entered the viewport once. Anything asserting on the lower half of a
 * page — the support centres carousel, the footer, a paginator — has to do this
 * first, otherwise the locator waits for an element that will never appear on
 * its own.
 *
 * The document grows as sections render, so the loop re-reads `scrollHeight`
 * on every step rather than measuring once.
 */
export async function scrollThroughPage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
}
