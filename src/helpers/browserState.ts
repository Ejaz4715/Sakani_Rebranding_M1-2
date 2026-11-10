import { Page } from '@playwright/test';
import { COOKIE_CONSENT, LANG } from '@data/testData';

/**
 * Interstitials the rebranded site shows on a first visit, and the
 * `localStorage` keys it writes once each has been dealt with.
 *
 * Seeding these before any page script runs is far more reliable than
 * dismissing them afterwards, because both render over the content and swallow
 * pointer events:
 *
 *  - `accept_cookies` — the consent bottom sheet uses a full-width backdrop and
 *    appears seconds after load, so dismissing it after the fact is an
 *    unavoidable race.
 *  - `countdown_closed` — the "Stay tuned!" promo card floats over the top-right
 *    of the landing page. It overlaps the header's mega-menu panel and makes
 *    "View all services" unclickable; measured directly, the Services menu
 *    click fails whenever the card is on screen and succeeds when it is not.
 *
 * `language` is seeded too: the server honours the stored preference over the
 * `/en` URL prefix, so navigating to `/en/...` without it silently serves
 * Arabic.
 */
export const SUPPRESSED_INTERSTITIALS = {
  cookieConsent: COOKIE_CONSENT.storageKey,
  promoCountdown: 'countdown_closed',
} as const;

export interface SeedOptions {
  /** Leave the cookie banner in place, for tests that assert on it. */
  keepCookieBanner?: boolean;
  /**
   * Language to pin, or `null` to leave the preference alone.
   *
   * The seed runs before every navigation, so a pinned language survives — and
   * overrides — anything the application itself writes. A test that exercises
   * the header's language toggle has to pass `null`, otherwise the toggle's own
   * choice is overwritten on the reload it triggers and the site comes back in
   * the pinned language.
   */
  language?: 'ar' | 'en' | null;
}

/** Seed browser state before any page script runs. */
export async function seedBrowserState(page: Page, options: SeedOptions = {}): Promise<void> {
  const { keepCookieBanner = false, language = LANG } = options;

  await page.addInitScript(
    ({ cookieKey, countdownKey, seedCookie, lang }) => {
      try {
        if (seedCookie) window.localStorage.setItem(cookieKey, 'true');
        window.localStorage.setItem(countdownKey, '1');
        if (lang) window.localStorage.setItem('language', lang);
      } catch {
        // Storage can be unavailable before the first real navigation.
      }
    },
    {
      cookieKey: SUPPRESSED_INTERSTITIALS.cookieConsent,
      countdownKey: SUPPRESSED_INTERSTITIALS.promoCountdown,
      seedCookie: !keepCookieBanner,
      lang: language,
    },
  );
}
