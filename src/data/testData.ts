/**
 * Central test data for the rebranded Sakani suite.
 *
 * Every value here was read off the running beta application during
 * exploration (`exploration/`), not copied from a specification. Where the
 * application and the manual test case disagree, the difference is called out
 * in a comment rather than silently normalised.
 */

/** UI language. The site persists this in `localStorage.language`. */
export const LANG = (process.env.SAKANI_LANG ?? 'ar') as 'ar' | 'en';

export const TEST_USER = {
  /** National ID used for Nafath login. Auto-approves on beta. */
  nationalId: process.env.SAKANI_NATIONAL_ID ?? '1119880042',
  /**
   * Fragment of the name the header renders once authenticated
   * ("الشيخة محمّد الأخضر" followed by the account-type chip "فردي").
   */
  displayName: process.env.SAKANI_USER_NAME ?? 'الأخضر',
} as const;

/** Where the storage state produced by `tests/setup/auth.setup.ts` is kept. */
export const STORAGE_STATE = '.auth/user.json';

/**
 * Routes of the rebranded pages.
 *
 * Re-verified on pre-beta on 2026-11-11: the rebranded CMS pages are now served
 * from the canonical, **unprefixed** routes. Every former `rebranding-*` path
 * (`/rebranding-sakani`, `/rebranding-services`, `/rebranding-news`, …) answers
 * 404, and the landing page moved from `/rebranding-sakani` to the site root.
 * The account portal and marketplace remain on the pre-existing `/app/*`
 * Angular routes.
 *
 * Every journey resolves its paths from this table — keep it the only place a
 * site route is written down.
 */
export const ROUTES = {
  landing: '/',
  services: '/services',
  /** Parent of every service detail page: `/services/<slug>`. */
  serviceDetail: (slug: string) => `/services/${slug}`,
  supportAndHelp: '/support-and-help',
  faqs: '/support-and-help/faqs',
  /** Rebranded Contact-us form. */
  contactUs: '/support-and-help/contact-us',
  /**
   * NOT re-verified after the 2026-11 route change: reaching it needs a real
   * submission (`@submits-data`). Derived from the form route by the same
   * prefix removal every other route underwent.
   */
  contactUsSuccess: '/support-and-help/contact-us/success',
  reports: '/reports',
  news: '/news',
  /** Parent of every article page: `/news/<slug>`. */
  newsArticle: /\/news\/[^/?#]+/,
  terms: '/terms',
  executiveRegulations: '/housing-subsidy-policy',
  /** Dedicated rebranded 404 page (reachable directly, see SAKANI-46035). */
  notFound: '/page-not-found',
  login: '/app/authentication/login',
  marketplace: '/app/marketplace',
  globalSearchResults: '/app/global-search/search-page',
  profileDashboard: '/app/user-profile/dashboard/overview',
} as const;

/**
 * A URL that does not exist, used to assert the wrong-URL behaviour.
 * Suffixed so it can never collide with a real CMS slug.
 */
export const UNKNOWN_ROUTE = '/unknown-page-qa-automation-404';

/* ------------------------------------------------------------------------ */
/* Header                                                                     */
/* ------------------------------------------------------------------------ */

/**
 * Top-level header navigation.
 *
 * `Properties for sale`, `Properties for rent` and `Services` open a hover
 * mega-menu; `Auctions` and `Support and help` navigate directly.
 */
export const HEADER_NAV = {
  propertiesForSale: 'عقارات للشراء',
  propertiesForRent: 'عقارات للإيجار',
  auctions: 'المزادات',
  services: 'الخدمات',
  supportAndHelp: 'الدعم والمساعدة',
} as const;

export const HEADER_NAV_LABELS = Object.values(HEADER_NAV);

/** English header labels, verified by switching the language toggle. */
export const HEADER_NAV_LABELS_EN = ['Buy', 'Rent', 'Auctions', 'Services', 'Help and Support'] as const;

/**
 * Where each header entry leads, read off the live header.
 *
 * Two shapes, because the header has two kinds of entry: `المزادات` (and
 * `الدعم والمساعدة`) navigate on click, while the two property entries and
 * `الخدمات` only open a hover panel — clicking one toggles its active style and
 * goes nowhere, so the redirection lives on the panel item instead.
 *
 * The panel items are `<button>`s with no `href`: the application routes them in
 * script, which is why the destinations below were observed by following them
 * rather than read off an attribute.
 */
export interface HeaderDestination {
  label: string;
  /** Panel items, for the entries that open a mega-menu. */
  items?: readonly string[];
  /** The item followed to prove the menu redirects, and where it lands. */
  follow: { item?: string; href: string };
}

export const HEADER_NAV_DESTINATIONS: readonly HeaderDestination[] = [
  {
    label: HEADER_NAV.auctions,
    follow: { href: '/app/marketplace?marketplace_purpose=auction' },
  },
  {
    label: HEADER_NAV.propertiesForSale,
    items: ['وحدات تحت الإنشاء', 'الوحدات الجاهزة', 'أراضي'],
    follow: {
      item: 'وحدات تحت الإنشاء',
      href: '/app/marketplace?marketplace_purpose=buy&product_types=units_under_construction',
    },
  },
  {
    label: HEADER_NAV.propertiesForRent,
    items: ['شقة', 'فيلا', 'تاون هاوس'],
    follow: { item: 'شقة', href: '/app/marketplace?marketplace_purpose=rent&unit_types=apartment' },
  },
] as const;

/**
 * The audience toggle SAKANI-42321 TC-01 asks for ("user type toggles").
 *
 * It is published in the **English** header only: `/en/rebranding-sakani` opens
 * "Individual Business Buy Rent Auctions Services Help and Support", while the
 * Arabic header of the same page renders no equivalent control anywhere in
 * `<header>` — not under a different label, the element is simply absent.
 * Recorded as a defect rather than normalised away; the suite runs in Arabic.
 */
export const HEADER_USER_TYPES = {
  english: ['Individual', 'Business'],
  /** What the Arabic header should offer beside the five nav entries. */
  arabicHeaderControls: ['English', 'تسجيل الدخول'],
} as const;

/** Columns rendered inside the Services mega-menu panel. */
export const SERVICES_MENU_COLUMNS = ['خدمات ومنتجات الدعم السكني', 'خدمات الحلول العقارية', 'أخرى'] as const;

export const SERVICES_MENU_VIEW_ALL = 'عرض جميع الخدمات';

/* ------------------------------------------------------------------------ */
/* Services page (SAKANI-46022)                                               */
/* ------------------------------------------------------------------------ */

export interface ServiceEntry {
  name: string;
  href: string;
}

/** The three category headings on the services page. */
export const SERVICE_CATEGORIES = ['خدمات ومنتجات الدعم السكني', 'خدمات الحلول العقارية', 'أخرى'] as const;

/** User-type filter chips above the catalogue. */
export const SERVICE_USER_TYPES = ['باحث عن عقار', 'مستأجر', 'بائع', 'مالك عقار', 'وسيط عقاري', 'مطور عقاري'] as const;

/**
 * Every service published on `/services`, read off the live page (re-read on
 * 2026-11-11 after the route change).
 *
 * `href` is asserted as well as the name, because several entries leave the
 * rebranded site (`/app/*`) and the catalogue is the only place that wiring is
 * visible. Since the route change every CMS service sits under
 * `/services/<slug>` with the `rebranding-` slug prefix dropped, and
 * "إدارة الأصول والمرافق" moved from `/page/amfm` into the catalogue. The last
 * five entries are new on the 2026-11 catalogue.
 */
export const SERVICES: readonly ServiceEntry[] = [
  // خدمات ومنتجات الدعم السكني
  { name: 'وحدات البيع على الخارطة', href: '/services/off-plan-projects' },
  { name: 'الوحدات الجاهزة', href: '/services/ready-units' },
  { name: 'أرضك دعمك', href: '/services/lands' },
  { name: 'التحقق من استحقاق الدعم السكني', href: '/services/check-eligibility' },
  { name: 'تحمل ضريبة التصرفات العقارية للمسكن الأول', href: '/services/real-estate-tax-incurred-service' },
  { name: 'المستشار العقاري', href: '/services/financial-advisory' },
  { name: 'خدمة تأجير الوحدة السكنية', href: '/services/housing-unit-rental' },
  { name: 'إفراغ الأراضي', href: '/services/conveyance-service' },
  { name: 'حلول البناء الذاتي', href: '/services/construction-solutions' },
  { name: 'منتج ذرى سكن +', href: '/services/sakani-plus' },
  // خدمات الحلول العقارية
  { name: 'إصدار شهادة الفرز', href: '/services/farz-certificate' },
  { name: 'التمويل العقاري الإلكتروني', href: '/services/online-lending' },
  { name: 'حاسبة التمويل العقاري', href: '/services/mortgage-calculator' },
  { name: 'إعادة بيع الوحدات', href: '/services/resell-units' },
  // أخرى
  { name: 'أخبار سكني', href: '/news' },
  { name: 'إدارة الأصول والمرافق', href: '/services/amfm' },
  { name: 'عروض سكني', href: '/app/promotion-vouchers' },
  { name: 'سكني ميتافيرس', href: '/services/sakani-metaverse' },
  { name: 'خدمة حجز المواعيد', href: '/services/appointment-service' },
  { name: 'الوحدات المميزة', href: '/services/featured-units' },
  { name: 'بيتك شخصيتك', href: '/services/home-personality' },
  { name: 'سابع جار', href: '/services/neighbors-greetings' },
  { name: 'السلوك الإيجاري', href: '/services/rental-score-inquiry' },
] as const;

/**
 * The hrefs a catalogue card can carry: a CMS service page, an `/app/*`
 * product, or the news listing. Used to tell catalogue cards apart from the
 * other links on the page.
 */
export const SERVICE_CARD_HREF = /^\/(services\/[^/?#]+|app\/|news$)/;

/** A term that matches exactly one service, used for the catalogue search. */
export const SERVICE_SEARCH = { term: 'حاسبة', expected: 'حاسبة التمويل العقاري' } as const;

/* ------------------------------------------------------------------------ */
/* Contact us (SAKANI-46873)                                                  */
/* ------------------------------------------------------------------------ */

/** The three request types offered by the "نوع الطلب" select. */
export const REQUEST_TYPES = {
  inquiry: 'استفسار',
  proposal: 'اقتراح',
  complaint: 'شكوى',
} as const;

/**
 * Only "استفسار" reveals a dependent sub-type select (`field-id="inquiry"`).
 * "اقتراح" and "شكوى" submit without one.
 */
export const INQUIRY_SUB_TYPES = ['استفسار عام', 'المنتجات', 'التسجيل والاستحقاق'] as const;

/**
 * Contact-us payload.
 *
 * Deliberately self-identifying: these submissions create real records in the
 * beta support inbox, so anyone reading one can see it came from automation.
 */
export const CONTACT_LEAD = {
  nationalId: TEST_USER.nationalId,
  name: 'حساب اختبار الجودة',
  phone: '512345678',
  email: 'qa.automation@example.com',
  region: 'الرياض',
  city: 'الرياض',
  message: (kind: string) => `QA AUTOMATION TEST (${kind}) - please ignore. Submitted by the rebranding Playwright suite.`,
} as const;

/** `subject` query parameter on the success URL, per request type. */
export const CONTACT_SUCCESS_SUBJECT = {
  inquiry: 'query',
  proposal: 'suggestion',
  complaint: 'complaint',
} as const;

/* ------------------------------------------------------------------------ */
/* FAQs (SAKANI-46872)                                                        */
/* ------------------------------------------------------------------------ */

export const FAQ = {
  /** Free-text term that narrows the list without emptying it. */
  searchTerm: 'الدعم',
  /** A category known to be published; used for the category filter. */
  category: 'منتج الوحدات الجاهزة من السوق',
  /** First question on the unfiltered first page. */
  firstQuestion: 'ماذا يهدف برنامج سكني؟',
} as const;

/* ------------------------------------------------------------------------ */
/* Reports (SAKANI-46375)                                                     */
/* ------------------------------------------------------------------------ */

/** Report category tabs. */
export const REPORT_TABS = {
  sakaniReports: 'تقارير سكني',
  residentialOutreach: 'التوعية السكنية',
  programBook: 'كتاب برنامج سكني',
} as const;

/**
 * Sort panel taxonomy, read off the live panel.
 *
 * Three groups, each mutually exclusive **within** the group. The manual test
 * case expects at most one option to be selected overall — see
 * `tests/reports/reports.spec.ts` for what the application actually does.
 */
export const REPORT_SORT = {
  groups: {
    publishDate: { label: 'تاريخ النشر', options: ['الأحدث', 'الأقدم'] },
    title: { label: 'العنوان', options: ['تصاعدي', 'تنازلي'] },
    download: { label: 'تحميل الملف', options: ['قابل للتحميل', 'قريباً'] },
  },
  allOptions: ['الأحدث', 'الأقدم', 'تصاعدي', 'تنازلي', 'قابل للتحميل', 'قريباً'],
  apply: 'تطبيق',
  clearAll: 'مسح الكل',
} as const;

/**
 * Preview affordances on a report card. Reports whose file is published render
 * a link; the rest render a disabled "coming soon" button.
 *
 * The published-report control used to be labelled with the raw translation key
 * `report_preview` (DEF-05). On 2026-11-11 it reads "معاينة". The page object
 * locates the control by what it *is* — an `<a download>` to a PDF — so the
 * DEF-05 assertion keeps judging the label rather than depending on it.
 */
export const REPORT_CARD = {
  previewKey: 'report_preview',
  previewLabel: 'معاينة',
  comingSoon: 'قريباً',
} as const;

/* ------------------------------------------------------------------------ */
/* News (SAKANI-46231)                                                        */
/* ------------------------------------------------------------------------ */

export const NEWS_SORT = {
  newest: 'تاريخ النشر: الأحدث',
  oldest: 'تاريخ النشر: الأقدم',
  groupLabel: 'نوع',
} as const;

export const NEWS_READ_MORE = 'اكتشف المزيد';

/* ------------------------------------------------------------------------ */
/* Help & support (SAKANI-46029)                                              */
/* ------------------------------------------------------------------------ */

/**
 * Support channel cards, with the destination each one opens.
 *
 * Since the 2026-11 route change "راسلنا" points at `/support-and-help/contact-us`,
 * which is now the rebranded form itself (the legacy page DEF-02 described is
 * gone), so its expected destination is simply `ROUTES.contactUs`.
 */
export const SUPPORT_CHANNELS = {
  contactUs: { title: 'راسلنا', href: ROUTES.contactUs },
  email: { title: 'البريد الإلكتروني', href: 'mailto:infoCS@momrah.gove.sa' },
  callCentre: { title: 'مركز عناية المستفيدين', href: 'tel:199090' },
  complaintsGuide: { title: 'دليل الشكاوي', action: 'حمل الملف', hrefContains: '.pdf' },
  faqs: { title: 'الأسئلة الشائعة', href: ROUTES.faqs },
  reportCorruption: { title: 'الابلاغ عن شبة فساد', action: 'تقرير', href: 'https://momah.gov.sa/ar/report-corruption' },
  signLanguage: { title: 'دعم لغة الإشارة الحية', hrefContains: 'metaverse.sakani.sa' },
  x: { title: 'X', href: 'https://x.com/SaudiHousingCC' },
  whatsapp: { title: 'واتس آب', hrefContains: 'api.whatsapp.com' },
} as const;

/** "Comprehensive locations" carousel. */
export const SUPPORT_LOCATIONS = {
  sectionTitle: 'مواقع مراكز سكني الشاملة',
  /** Was "الاتجاهات" before the 2026-11 release. */
  directionsLabel: 'توجه للموقع',
  /** Centres, in the order the carousel renders them. */
  centres: [
    { city: 'الرياض', title: 'موقع سكني الشامل في الرياض' },
    { city: 'جدة', title: 'موقع سكني الشامل في جدة' },
    { city: 'الخبر', title: 'موقع سكني الشامل في الخبر' },
    { city: 'المدينة المنورة', title: 'موقع سكني الشامل في المدينة المنورة' },
  ],
  /** "Directions" opens the national Balady map service in a new tab. */
  directionsHost: 'plus.balady.sa',
} as const;

/* ------------------------------------------------------------------------ */
/* Legal documents (SAKANI-46030 / SAKANI-46031)                              */
/* ------------------------------------------------------------------------ */

export const TERMS = {
  title: 'الشروط والأحكام وسياسة الخصوصية',
  headings: [
    'تمهيد',
    'الموافقة على سياسة الخصوصية',
    'الأساس النظامي لجمع ومعالجة البيانات الشخصية',
    'البيانات التي سيتم جمعها',
    'طرق جمع البيانات',
    'الغرض من استخدام البيانات',
    'ملفات تعريف الارتباط (Cookies)',
    'تخزين وحماية البيانات الشخصية:',
    'ولضمان مساعدتك في حماية معلوماتك الشخصية فإننا نوصي بالآتي:',
    'حقوقك فيما يتعلق بمعالجة بياناتك الشخصية',
    'كيفية اتلاف البيانات:',
    'مشاركة البيانات الشخصية:',
    'التغييرات في سياسة الخصوصية',
    'اتفاقية مستوى الخدمة',
    'الروابط الخاصة بمواقع أخرى',
    'التشريعات ذات العلاقة',
    'التواصل معنا',
  ],
} as const;

export const EXECUTIVE_REGULATIONS = {
  title: 'اللوائح التنفيذية لدعم الإسكان',
  headings: ['التعريفات', 'الاستفادة من الدعم السكني', 'إجراءات تقديم الطلب', 'أنواع الدعم السكني', 'قوائم الأولوية', 'تخصيص الدعم السكني', 'الأقساط المالية', 'اللجنة', 'أحكام عامة'],
} as const;

/* ------------------------------------------------------------------------ */
/* Profile (SAKANI-46032)                                                     */
/* ------------------------------------------------------------------------ */

export interface ProfileSection {
  /** Side-nav label. */
  label: string;
  /** Whether activating the entry navigates or expands a group in place. */
  kind: 'navigates' | 'expands';
  /**
   * Route the entry reaches. Omitted where the destination is not settled —
   * "المساعدة والدعم" currently lands on `/page-not-found`, so there is no
   * correct route to assert against yet (see the profile spec).
   */
  path?: string;
  /** Heading the destination renders. */
  heading?: string;
  /** Child entries revealed by an expandable group. */
  children?: readonly string[];
}

/**
 * The account portal's side navigation, every route and heading verified live.
 * "لوحة البيانات" is the section the portal opens on, so activating it stays put.
 */
export const PROFILE_SECTIONS: readonly ProfileSection[] = [
  { label: 'لوحة البيانات', kind: 'navigates', path: '/app/user-profile/dashboard/overview' },
  { label: 'معلوماتي', kind: 'navigates', path: '/app/user-profile/my-information', heading: 'حساب تعريفي' },
  { label: 'محفظتي', kind: 'navigates', path: '/app/user-profile/my-wallet', heading: 'محفظة' },
  { label: 'المستشار العقاري', kind: 'navigates', path: '/app/user-profile/personal-financials', heading: 'المستشار العقاري' },
  {
    label: 'أنشطتي',
    kind: 'expands',
    children: ['الحجوزات', 'الطلبات المالية', 'الصفقات المشتراه', 'قائمة الانتظار المسجل بها', 'التصاميم الهندسية'],
  },
  { label: 'التفضيلات', kind: 'expands' },
  { label: 'سجل مدفوعاتي', kind: 'navigates', path: '/app/user-profile/payment-transaction', heading: 'سجل المدفوعات' },
  { label: 'المفضلة', kind: 'navigates', path: '/app/user-profile/favorites', heading: 'المفضلة' },
  { label: 'المساعدة والدعم', kind: 'navigates' },
] as const;

/** Entries in the header user menu once authenticated. */
export const USER_MENU = {
  manageProfile: 'إدارة الملف الشخصي',
  notifications: 'إشعارات',
  wallet: 'محفظة',
  bookings: 'حجوزاتي',
  favorites: 'المفضلة',
  helpAndSupport: 'المساعدة والدعم',
  logout: 'خروج',
} as const;

/* ------------------------------------------------------------------------ */
/* Global search (SAKANI-46230)                                               */
/* ------------------------------------------------------------------------ */

export const GLOBAL_SEARCH = {
  /** Query that returns both project and developer results on beta. */
  term: 'الرياض',
  placeholder: 'ماذا تبحث عنه؟ العقارات أو الخدمات أو الدعم',
  /** Result group headings rendered for the query above. */
  groups: ['العقارات', 'المطور / الوسيط'],
  /** Default panel heading before a query is typed. */
  popularServicesHeading: 'الخدمات الأكثر شيوعًا',
  seeAllLabel: /عرض كل النتائج|عرض جميع النتائج|كل النتائج/,
} as const;

/* ------------------------------------------------------------------------ */
/* Landing page (SAKANI-46026)                                                */
/* ------------------------------------------------------------------------ */

/**
 * The hero search bar.
 *
 * Beta carries editorial placeholder content ("Test Main Banner", "CTA title"),
 * so landing assertions target the durable controls rather than the copy.
 */
export const LANDING_SEARCH = {
  buyTab: 'شراء',
  rentTab: 'إيجار',
  /** Was "البحث حسب المدينة" before the 2026-11 release. */
  cityPlaceholder: 'ابحث عن مدينة',
  unitTypeLabel: 'نوع الوحدة',
  priceRangeLabel: 'نطاق السعر',
  submit: 'ابدأ الاستكشاف',
} as const;

export const COOKIE_CONSENT = {
  accept: 'قبول ملفات تعريف الارتباط',
  reject: 'رفض ملفات تعريف الارتباط',
  /** Key the site writes once a choice is made. */
  storageKey: 'accept_cookies',
} as const;

/* ------------------------------------------------------------------------ */
/* Landing page rebranding (SAKANI-41908, mirrored by SAKANI-42321 TC-01..05) */
/* ------------------------------------------------------------------------ */

/**
 * The brand promo in the hero carousel.
 *
 * The manual case calls it a "video toggle", and SAKANI-42321 TC-02 calls it a
 * "brand video modal". Beta implements neither: there is no `<video>` element
 * and no dialog anywhere on the page. The promo is an `<a target="_blank">`
 * pointing straight at an `.mp4`, one per carousel slide, so activating it
 * hands the file to a new tab. The spec asserts what is there and records the
 * divergence rather than inventing a control to click.
 */
export const HERO_VIDEO = {
  cta: 'اكتشف ساكاني الجديد',
  filePattern: /\.mp4(\?|$)/,
  /**
   * What activating it really does, observed by scripting the click (the
   * carousel rotates under a pointer click, so a plain `click()` races it):
   * a second tab opens on the `.mp4` itself and the browser plays it there.
   * The page keeps zero `<video>` elements and opens no dialog, so there is
   * neither an in-place player to toggle nor a brand video modal.
   */
  opensInNewTab: true,
} as const;

/**
 * The hero banner carousel.
 *
 * Beta serves editorial placeholder copy in several slides ("Test Main Banner",
 * "CTA title", "test"), so the promotional content is asserted structurally —
 * every slide carries a title, a description and a call to action — rather than
 * on wording that is not the product's final copy.
 *
 * The carousel also **auto-rotates**, which rules out asserting that a dot click
 * changes the visible copy: it changes on its own a moment later either way.
 * What is deterministic is which dot claims `aria-current`, so that is what the
 * dot assertions are built on.
 */
export const HERO_CAROUSEL = {
  slideLabel: (n: number) => `Go to slide ${n}`,
  /** `swiper` markup: the live slide and the class the title/description carry. */
  activeSlide: '.swiper-slide-active',
  titleClass: 'banner-title',
  descriptionClass: 'banner-description',
  /** Slides published on beta at the time of writing; more may be added. */
  minimumSlides: 2,
} as const;

/** The three product cards, each handing off to the marketplace pre-filtered. */
export const LANDING_PRODUCTS = [
  {
    title: 'الوحدات السكنية على الخارطة',
    href: '/app/marketplace?marketplace_purpose=buy&product_types=units_under_construction',
  },
  { title: 'الوحدات الجاهزة', href: '/app/marketplace?marketplace_purpose=buy&product_types=readymade_units' },
  { title: 'وحدات للإيجار', href: '/app/marketplace?marketplace_purpose=rent' },
] as const;

/**
 * The developer/partner logo strip under the products.
 *
 * Every logo is a bare `<img alt="developer logo">` with no anchor around it,
 * so there is nothing to redirect to — see the spec for how that is reported.
 */
export const PARTNER_LOGOS = {
  alt: 'developer logo',
  expectedCount: 6,
  sectionText: 'مع مجموعة مختارة من مطوري العقارات',
} as const;

/** "Fewer steps, more clarity" — the three customer-scenario cards. */
export const LANDING_SCENARIOS = {
  sectionHeading: /خطوات أقل، وضوح أكثر/,
  cards: ['هل تبحث عن عقار؟', 'هل تبحث عن استئجار منزل؟', 'هل تملك عقارًا؟'],
  /**
   * CTA labels rendered inside the cards, re-read off the live page on
   * 2026-11-11. The release replaced "احسب قدرتك الشرائية" and "تقسيم الأراضي"
   * and added five CTAs; every one is still published as `href="#"` (DEF-11).
   */
  links: [
    // هل تبحث عن عقار؟
    'قدّم على تمويل سكني',
    'إصدار شهادة ضريبة القيمة المضافة',
    'تحقق من أهليتك للدعم السكني',
    'استكشف المزيد من خيارات العقارات',
    // هل تبحث عن استئجار منزل؟
    'اكتشف سوق الإيجار',
    'اكتشف قائمة الوسطاء',
    'توثيق العقود الرقمية',
    'استكشف المزيد من خيارات الإيجار',
    // هل تملك عقارًا؟
    'اعرض وحدتك',
    'إصدار خدمة النقل',
    'إصدار شهادة فرز',
    'استكشف المزيد من الخيارات',
  ],
} as const;

/**
 * The key-metrics band.
 *
 * The figures count up on scroll — two consecutive reads gave "625+ / 200,000+
 * / 0.8M+" and "1,000+ / 320,000+ / 1.2M+" — so only the caption and the
 * number format can be asserted, never a value.
 */
export const LANDING_METRICS = {
  captions: ['الشركاء', 'إجمالي المستخدمين', 'المعاملات'],
  valuePattern: /^[\d.,]+\s*(K|M|B)?\+$/i,
} as const;

/** The mobile-app promotion beside the metrics. */
export const APP_DOWNLOAD = {
  appStore: { alt: 'App Store', hrefContains: 'apps.apple.com' },
  googlePlay: { alt: 'Google Play', hrefContains: 'play.google.com' },
  qrAlt: 'QR Code',
} as const;

/**
 * The newsletter capture in the footer.
 *
 * SAKANI-42321 TC-08 describes it as part of the *global* footer. It is not:
 * beta publishes the block on the landing page alone, and the catalogue,
 * service templates and reports listing all render the same footer without it.
 *
 * The address is the same QA-labelled one the contact-us journeys use, so a
 * subscription created by a run is identifiable by whoever reads the list.
 */
export const NEWSLETTER = {
  heading: 'اشترك في النشرة الدورية من سكني',
  placeholder: 'أدخل بريدك الإلكتروني',
  submit: 'اشترك',
  email: CONTACT_LEAD.email,
  invalidEmail: 'not-an-email',
  /** Toast raised on success, and the message shown for a malformed address. */
  successMessage: 'تم الاشتراك في النشرة الإخبارية بنجاح',
  invalidMessagePattern: /غير صالح|invalid/i,
  /**
   * Third-party beacons that carry form values as payload. A subscription has to
   * reach something that can *store* the address and dispatch to it, so these
   * are excluded before the storage verdict — telemetry is not a subscription.
   */
  telemetryPattern: /google|firebase|clarity|doubleclick|gtm|cdn-cgi|analytic/i,
} as const;

/* ------------------------------------------------------------------------ */
/* Global footer inventory                                                    */
/* ------------------------------------------------------------------------ */

export interface FooterLink {
  /** Visible label, for the links that carry text. */
  label?: string;
  /** `alt` of the image, for the icon-only links whose name comes from it. */
  alt?: string;
  href?: string;
  /** For links whose URL carries a generated path, e.g. the FAL certificate. */
  hrefContains?: string;
  /** Opens in a new tab. */
  newTab?: boolean;
  /** Leaves the Sakani site. */
  external?: boolean;
}

/**
 * Every link the global footer publishes, in render order.
 *
 * `Footer.destinations` covers only the seven that other journeys navigate
 * through; this is the full set, for the case that asks for all of them.
 *
 * Note that "بيانات سكني", "شركاء سكني", "ديجيتار" and "المؤشرات العقارية"
 * leave the site **without** `target="_blank"`, so they replace the current
 * page rather than opening beside it — recorded as observed.
 *
 * The social row was re-read on 2026-11-11: the release dropped Snapchat and
 * Facebook, added LinkedIn and TikTok, and moved YouTube, WhatsApp (now a
 * channel) and Instagram to new URLs. Those are the owner's content choices and
 * are mirrored here.
 *
 * "الأسئلة الشائعة" is deliberately still expected at `ROUTES.faqs`: the
 * release points it at the support hub (`/support-and-help`) instead, which is
 * a broken label/destination pair, not a new baseline (DEF-16).
 */
export const FOOTER_LINKS: readonly FooterLink[] = [
  { alt: 'Youtube logo', href: 'https://www.youtube.com/@Sakani', newTab: true, external: true },
  { alt: 'Whatsapp logo', href: 'https://whatsapp.com/channel/0029VbBckQJFMqrPN3WTAu20', newTab: true, external: true },
  { alt: 'Instagram logo', href: 'https://www.instagram.com/sakaniksa/', newTab: true, external: true },
  { alt: 'X logo', href: 'https://x.com/sakani', newTab: true, external: true },
  { alt: 'Linkedin logo', href: 'https://www.linkedin.com/company/sakani', newTab: true, external: true },
  { alt: 'Tiktok logo', href: 'https://www.tiktok.com/@sakani', newTab: true, external: true },
  { label: 'السوق العقاري', href: ROUTES.marketplace },
  { label: 'بيانات سكني', href: 'https://bayanat.sakani.sa', external: true },
  { label: 'شركاء سكني', href: 'https://partners.sakani.sa/', external: true },
  { label: 'ديجيتار', href: 'https://digitar.sakani.sa/', external: true },
  { label: 'الأخبار', href: ROUTES.news },
  { label: 'المؤشرات العقارية', href: 'https://rei.rega.gov.sa/', external: true },
  { label: 'المؤشرات الإيجارية', href: '/reports-and-data/rental-units' },
  { label: 'تقارير سكني', href: ROUTES.reports },
  { label: 'سياسة الخصوصية', href: ROUTES.terms },
  { label: 'اللائحة التنفيذية لتنظيم الدعم السكني', href: ROUTES.executiveRegulations },
  { label: 'الدعم والمساعدة', href: ROUTES.supportAndHelp },
  { label: 'الأسئلة الشائعة', href: ROUTES.faqs },
  { label: 'لغة الإشارة', hrefContains: 'metaverse.sakani.sa', newTab: true, external: true },
  { alt: 'FAL license', hrefContains: 'fal_license_report.pdf', newTab: true, external: true },
] as const;

/* ------------------------------------------------------------------------ */
/* Service catalogue search & filters (SAKANI-42321 TC-06/TC-07)              */
/* ------------------------------------------------------------------------ */

/**
 * Terms for the catalogue search, each chosen for what it proves.
 *
 * The catalogue is published in Arabic only, so upper/lower case has no
 * meaning in the data itself; `latin`/`latinUpper` are the honest way to check
 * the search treats case consistently — both must produce the same result.
 */
export const CATALOGUE_SEARCH = {
  exact: { term: 'حاسبة التمويل العقاري', expected: 'حاسبة التمويل العقاري' },
  partial: { term: 'حاسبة', expected: 'حاسبة التمويل العقاري' },
  /** Matches several services rather than one. */
  broad: { term: 'وحدات', minimumHits: 3 },
  /** Padded form of `partial`, to show the term is trimmed. */
  padded: '  حاسبة  ',
  latin: 'metaverse',
  latinUpper: 'METAVERSE',
  noMatch: 'zzzznotaservice',
  emptyState: 'لا توجد خدمات',
  emptyStateHint: 'الرجاء تجربة مصطلح بحث مختلف',
  clearLabel: 'Clear',
} as const;

/**
 * User-type filters.
 *
 * Selecting several is a union, not an intersection: "باحث عن عقار" ∪
 * "مطور عقاري" returns everything either audience is offered. The pair below is
 * chosen because neither set contains the other, so the union is observable.
 */
export const CATALOGUE_FILTERS = {
  primary: 'باحث عن عقار',
  secondary: 'مطور عقاري',
  /** Offered to the developer audience but not to the property seeker. */
  secondaryOnlyService: 'إصدار شهادة الفرز',
  /** Offered to neither, so filter + term is a contradiction with no results. */
  conflictingTerm: 'حاسبة',
} as const;

/* ------------------------------------------------------------------------ */
/* Service template page (SAKANI-42357)                                       */
/* ------------------------------------------------------------------------ */

/**
 * Service detail pages come in more than one template. The eligibility service
 * uses the full one — tabs, a details sidebar, related services and the rating
 * control; the off-plan product uses a plain editorial layout with none of
 * those. Both are asserted, because "templates and section functionality"
 * (TC-08) is about exactly that difference.
 */
export const SERVICE_TEMPLATE = {
  full: {
    route: ROUTES.serviceDetail('check-eligibility'),
    title: 'التحقق من استحقاق الدعم السكني',
    tabs: ['خطوات التسجيل', 'مميزات الخدمة'],
    startCta: { label: 'بدء الخدمة', href: '/app/eligibility/check' },
    favouriteCta: 'اضافة الى المفضلة',
    /** Label/value rows in the details sidebar. */
    details: [
      { label: 'الفئة المستهدفة', value: 'المواطنين' },
      { label: 'مدة الخدمة', value: 'فورية' },
      { label: 'قنوات الخدمة', value: 'تطبيق الويب والجوال' },
      { label: 'تكلفة الخدمة', value: 'مجانًا' },
    ],
    /** Support links in the same sidebar. */
    sidebarLinks: [
      { label: 'تصفح', href: ROUTES.faqs },
      { label: '199090', href: 'tel:199090' },
      { label: 'infoCS@momah.gov.sa', href: 'mailto:infoCS@momah.gov.sa' },
    ],
    /** Was "تحميل"; the 2026-11 release labels it in English inside the Arabic UI. */
    guideDownload: { label: 'Download User Guide', hrefContains: '.pdf' },
  },
  editorial: {
    route: ROUTES.serviceDetail('off-plan-projects'),
    title: 'وحدات البيع على الخارطة',
    sections: ['مميزات المنتج'],
    cta: 'عرض الوحدات',
  },
  relatedHeading: 'خدمات ذات صلة',
  relatedViewAll: { label: 'عرض الكل', href: ROUTES.services },
  rating: {
    question: 'هل كانت هذه الصفحة مفيدة؟',
    yes: 'نعم',
    no: 'لا',
    /** Vote endpoint the yes/no control talks to. */
    endpoint: '/cms_portal/api/v1/vote_service',
  },
  breadcrumb: ['الصفحة الرئيسية', 'الخدمات'],
} as const;

/* ------------------------------------------------------------------------ */
/* Unified login page rebranding (SAKANI-41917 / SAKANI-43048)                */
/* ------------------------------------------------------------------------ */

/**
 * The copy and links on `/app/authentication/login`.
 *
 * SAKANI-41917 asks that the redesign changed colour only: the links must still
 * be reachable and the wording must not have moved. Both are baselines read off
 * the live page.
 */
export const LOGIN_PAGE = {
  heading: 'سجّل الدخول أو أنشئ حسابك الآن',
  intro: 'ابدأ رحلتك، سجل أو قم بتسجيل الدخول الآن.',
  identifierLabel: 'البريد الإلكتروني أو رقم الهاتف المحمول أو الهوية',
  identifierPlaceholder: 'أدخل معرفك أو رقم هاتفك أو بريدك الإلكتروني',
  submit: 'تسجيل الدخول',
  nafath: 'المتابعة مع نفاذ',
  consent: 'أقبل سكني شروط الاستخدام و سياسة الخصوصية',
  /**
   * The two consent links. They still point at the pre-rebranding routes
   * (`/terms`, `/housing-subsidy-policy`) rather than their `rebranding-`
   * counterparts — asserted as observed, and reported in the spec.
   */
  links: [
    { label: 'شروط الاستخدام', href: '/terms' },
    { label: 'سياسة الخصوصية', href: '/housing-subsidy-policy' },
  ],
  securityNoticeLinks: [{ label: 'سياسة الخصوصية', href: 'https://www.cloudflare.com/turnstile-privacy-policy/' }],
  securityNotice: /Cloudflare|reCAPTCHA/i,
} as const;

/**
 * What the identifier field says when it is given something it cannot use.
 *
 * The field accepts three kinds of identifier — national id, mobile number,
 * email — and picks its complaint from what the value looks like, so a run of
 * digits starting with 0 is judged as a mobile number rather than as a national
 * id. In every case the message appears beneath the field and "تسجيل الدخول"
 * stays disabled, so nothing is ever submitted.
 *
 * A well-formed but unissued number is a different journey: it passes this
 * validation and goes on to the Nafath modal, where the rejection comes from
 * Nafath rather than from the form. That is out of scope for this case.
 */
export const LOGIN_ERRORS = [
  { name: 'too short for a national id', value: '123', message: 'رقم الهوية يجب أن يكون 10 أرقام يبدأ ب 1 أو 2' },
  { name: 'not a number at all', value: 'abcdefgh', message: 'القيمة غير صالحة أو بتنسيق خاطئ' },
  { name: 'ten digits, but read as a mobile number', value: '0000000000', message: 'رقم الجوال يجب أن يكون 8 خانات بعد 5(966)' },
] as const;

/* ------------------------------------------------------------------------ */
/* Profile dashboard by nationality (SAKANI-47569)                            */
/* ------------------------------------------------------------------------ */

/**
 * The second identity SAKANI-47569 TC-02/TC-03 need.
 *
 * Beta issues it as an iqama rather than a national ID
 * (`national_id_number_type: "iqama"` on `/beneficiary/me`), which is what puts
 * the account on the non-Saudi side of the split. Supplied through the
 * environment so the credential stays out of the repository; both cases skip
 * with that reason when it is absent.
 */
export const NON_SAUDI_USER = {
  nationalId: process.env.SAKANI_NON_SAUDI_NATIONAL_ID ?? '',
  displayName: process.env.SAKANI_NON_SAUDI_USER_NAME ?? '',
} as const;

/**
 * The profile dashboard, which splits by nationality.
 *
 * `skn-card-v6` is the card element the overview is built from. A Saudi
 * beneficiary gets the full set; an iqama holder gets exactly two — the two
 * mortgage services, which are open to everyone. Everything tied to housing
 * support is what disappears, not the finance products, so the withheld list
 * below is deliberately narrower than "all the Saudi services".
 */
export const DASHBOARD = {
  cardElement: 'skn-card-v6',
  nonSaudiCardCount: 2,
  /** Service cards the full dashboard offers, read off the live overview. */
  saudiServices: ['التمويل العقاري الإلكتروني', 'حاسبة التمويل العقاري', 'المستشار العقاري'],
  /** Blocks only a fully-served beneficiary is shown. */
  saudiOnlyBlocks: ['التنازل عن استحقاق الدعم السكني'],
  browseUnits: 'تصفح الوحدات',
  /** The two cards an iqama holder keeps. */
  nonSaudiServices: ['التمويل العقاري الإلكتروني', 'حاسبة التمويل العقاري'],
  /** What the split takes away from them. */
  nonSaudiWithheld: ['المستشار العقاري', 'التنازل عن استحقاق الدعم السكني', 'تصفح الوحدات'],
  eligibilityService: {
    route: ROUTES.serviceDetail('check-eligibility'),
    startCta: 'بدء الخدمة',
    href: '/app/eligibility/check',
    /**
     * The gate a non-Saudi user hits on "بدء الخدمة".
     *
     * The page keeps several dialogs in its DOM at once — a logout
     * confirmation and the cookie notice among them — all `role="dialog"` and
     * all hidden, so this one has to be found by its wording rather than by
     * position.
     */
    nationalsOnly: {
      title: 'خدمة خاصة بالمواطنين',
      body: 'هذه الخدمة متاحة للمواطنين السعوديين فقط في الوقت الحالي.',
      confirm: 'موافق',
    },
  },
} as const;

/** Backend endpoints asserted by the journeys. */
export const API = {
  captcha: '/captchaApi/grecaptcha/validate',
  sessionCheck: '/authApi/api/v4/beneficiary_session/check',
  iamInit: '/authApi/api/v4/iam',
  iamLogin: '/authApi/api/v4/iam/login',
  me: '/mainIntermediaryApi/v4/beneficiary/me',
  contactUsForm: '/cms_portal/api/v1/contact_us_form',
  voteService: '/cms_portal/api/v1/vote_service',
} as const;
