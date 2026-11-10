# Sakani Rebranding — E2E test cases

Every test case in the suite, grouped by area, with the section of the product it exercises,
the spec file that implements it, and how it last behaved.

- **Inventory generated from `npx playwright test --list`**, so test ids, spec paths and line numbers cannot drift from the repo.
- **Result column** is the full regression of **2026-08-31 10:03** — 68 tests, **54 passed, 14 failed, 0 skipped**, 20.0 minutes, every project included (`setup`, `guest`, `authenticated`). The report embedded in `playwright-report/index.html` is that run's own data and can be reopened with `npx playwright show-report`.
  - Earlier versions of this file recorded results from a run whose only surviving artefact was a `npx playwright test --list` inventory — 65 tests, all reported as skipped, zero executed — so those results were documentation rather than evidence. They have been replaced by the run above.
  - `test-results/` holds traces only for the **last** command run, not for the regression: Playwright clears that directory at the start of every run. The report is the durable record.
- **Manual Case** holds the `TC-xx` number as supplied in the batch the case arrived in, so a ticket can carry the same number twice; the later review batch is marked `(review)`. No AIO export has been received, so there are no AIO ids here.
  - A `—` means no number was ever supplied for that case, not that it is unnumbered upstream. Every ticket under **Pre-existing coverage** is in that position except `SAKANI-46026-01`, numbered from the 2026-08-31 verification request. Send the batch numbering (or an AIO export) and the rest can be filled in.
- **Nothing is skipped or blocked.** Every failure below is an open product defect, not a gap in the automation.

| | Count |
|---|---|
| Automated — passed | 54 |
| Automated — failed (all product defects) | 14 |
| Automated — skipped (blocked on test data) | 0 |
| Manual cases already covered, not automated twice | 9 |
| **Total rows** | **77** |

## Added from the 2026-08-30 batch

### SAKANI-41908 — Landing page rebranding (M1)

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-41908-01 | TC-01 | Validate Hero Video Toggle and Buy/Rent Search Interactions | **Hero Section** | `tests/landing/landing-rebranding.spec.ts`:35 | guest | — | ❌ Failed | DEF-14 |
| SAKANI-41908-02 | TC-02 | Validate Product Cards & Partner Logo Redirections | **Products** | `tests/landing/landing-rebranding.spec.ts`:171 | guest | — | ❌ Failed | DEF-10 |
| SAKANI-41908-03 | TC-03 | Validate Scenario Cards, Title Enhancements & Link Redirections | **Scenarios & Links** | `tests/landing/landing-rebranding.spec.ts`:233 | guest | — | ❌ Failed | DEF-11 |
| SAKANI-41908-04 | TC-04 | Validate Mobile App Download Promotion & Feature Links | **Key Metrics** | `tests/landing/landing-rebranding.spec.ts`:273 | guest | — | ✅ Passed | — |
| SAKANI-41908-05 | TC-05 | Validate Newsletter Email Capture, Storage & Automated Dispatch | **Footer** | `tests/landing/landing-rebranding.spec.ts`:306 | guest | @submits-data | ❌ Failed | DEF-12 |
| SAKANI-41908-06 | TC-06 | Validate Navigation Bar Elements, Toggle & Search Modal Interaction | **Navigation** | `tests/landing/landing-rebranding.spec.ts`:458 | guest | — | ❌ Failed | DEF-15 |
| SAKANI-41908-07 | TC-06 (review) | Validate redirection of ALL footer links | **Footer** | `tests/landing/landing-rebranding.spec.ts`:399 | guest | — | ✅ Passed | — |
| — | TC-02 (review) | Validate the search popup is dismissed by its close button | **Search modal** | `tests/landing/landing-rebranding.spec.ts`:458 | guest | — | ↩︎ covered | — |

- **SAKANI-41908-01** — Covers the banner's promotional content (each slide carries a title, a description and a CTA), the pagination dots, the promo file, and what activating it does: a second tab receives the `.mp4` and plays it there. **DEF-14** — the case asks for a video *toggle* and SAKANI-42321 TC-02 for a "brand video modal display"; the page has no `<video>` element and opens no dialog, so there is neither. Until 2026-08-31 this test asserted the *absence* of a player, which let the missing feature pass silently
- **SAKANI-41908-02** — All six partner logos are plain images with no link around them
- **SAKANI-41908-03** — All 14 scenario CTAs are published as href="#". (Fourteen rendered anchors, drawn from nine distinct labels — several CTAs repeat across the three cards)
- **SAKANI-41908-04** — Metric figures animate on scroll, so only caption and format are asserted; the store links are asserted on `href`, not opened
- **SAKANI-41908-05** — Success **is** confirmed on screen ("تم الاشتراك في النشرة الإخبارية بنجاح"). **DEF-12** — the address only ever reaches `POST /analyticCollector/collect` (200), which is telemetry, so nothing can store it or dispatch to it. The assertion now records the response status of every request carrying the address. The dispatch itself is not provable from the browser and needs a mailbox or back-office check
- **SAKANI-41908-06** — Nav elements, the destinations behind them, the search overlay (dismissed both by its own close button and by Escape) and the language toggle. Redirections asserted: `المزادات` → `/app/marketplace?marketplace_purpose=auction`; `عقارات للشراء` → panel item "وحدات تحت الإنشاء" → `…?marketplace_purpose=buy&product_types=units_under_construction`; `عقارات للإيجار` → "شقة" → `…?marketplace_purpose=rent&unit_types=apartment`. `الخدمات` and `الدعم والمساعدة` are followed by SAKANI-46022-01 and SAKANI-46029-01 and not repeated. **DEF-15** — the audience toggle ("user type toggles") is published in the English header as *Individual* / *Business* but is absent from the Arabic header altogether
- **SAKANI-41908-07** — All 20 footer links asserted on href and target; the eight internal routes are followed in the browser, third-party destinations are not opened
- **SAKANI-41908 TC-02 (review)** — Row added 2026-08-31: the case was implemented but never listed. The review batch asked for the search popup to be dismissed by its **own close button**, not only by Escape; SAKANI-41908-06 asserts both, in the steps "its close button dismisses it" and "and so does Escape, once it is open again", and `GlobalSearch.closeButton` exists for it. Not automated twice, so it carries no test id of its own

### SAKANI-41917 — Unified login page rebranding (M1)

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-41917-01 | TC-01 | Verify links remain clickable after color update | **Consent links** | `tests/auth/login-rebranding.spec.ts`:13 | guest | — | ✅ Passed | — |
| SAKANI-41917-03 | TC-01 (review) | Verify login error message content with an incorrect user ID | **Login validation** | `tests/auth/login-rebranding.spec.ts`:107 | guest | — | ✅ Passed | — |
| SAKANI-41917-02 | TC-02 | Verify message content is unchanged after rebranding | **Page copy** | `tests/auth/login-rebranding.spec.ts`:70 | guest | — | ✅ Passed | — |

- **SAKANI-41917-01** — **Both** consent links are followed in the browser, each from a freshly opened login page: they sit a few characters apart in one run of text, so an overlay can take out one and leave the other working. Until 2026-08-31 only "شروط الاستخدام" was clicked. Both still point at the pre-rebranding /terms and /housing-subsidy-policy
- **SAKANI-41917-03** — Field-level validation, with submit held shut. A well-formed but unissued id passes this step and is rejected later by Nafath instead

### SAKANI-42321 — Service catalogue rebranding (M1)

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-42321-01 | TC-01 | Validate global navigation header on the service catalogue page | **Navigation** | `tests/services/service-catalogue-rebranding.spec.ts`:31 | guest | — | ✅ Passed | — |
| — | TC-02 | Validate hero banner promotional content, brand video modal display, and buy/rent property search filter tab interactions | **Hero Section** | `tests/landing/landing-rebranding.spec.ts`:35 | guest | — | ↩︎ covered | DEF-14 |
| — | TC-03 | Validate product grid card details, navigation links, and official partner logo redirection URLs | **Products** | `tests/landing/landing-rebranding.spec.ts`:165 | guest | — | ↩︎ covered | DEF-10 |
| — | TC-04 | Validate customer scenario section layout, link dynamic structure, and external/internal page redirections | **Scenarios & Links** | `tests/landing/landing-rebranding.spec.ts`:227 | guest | — | ↩︎ covered | DEF-11 |
| — | TC-05 | Validate key system metrics display and App Store / Google Play store app download CTA links | **Key Metrics** | `tests/landing/landing-rebranding.spec.ts`:267 | guest | — | ↩︎ covered | — |
| SAKANI-42321-06 | TC-06 | Validate service catalogue search bar inputs | **Search bar** | `tests/services/service-catalogue-rebranding.spec.ts`:75 | guest | — | ✅ Passed | — |
| SAKANI-42321-07 | TC-07 | Validate service catalogue filters and combined queries | **Filters** | `tests/services/service-catalogue-rebranding.spec.ts`:145 | guest | — | ✅ Passed | — |
| SAKANI-42321-08 | TC-08 | Validate global footer navigation and newsletter subscription | **Footer** | `tests/services/service-catalogue-rebranding.spec.ts`:220 | guest | — | ❌ Failed | DEF-13 |

- **SAKANI-42321-01** — Added 2026-08-31. The case's *behaviour* — the nav entries' destinations, the language switcher, the audience toggle — is asserted once on the landing page by SAKANI-41908-06, but nothing had ever checked that the catalogue publishes the same working header, which is where this case applies. This test asserts the header on `/rebranding-services`: all five nav entries, login, the magnifier, the language toggle, the search overlay opening and closing from the catalogue, and login redirecting to `/app/authentication/login`. The catalogue's own user-type chips are SAKANI-42321-07's; the header's missing audience toggle is DEF-15
- **SAKANI-42321 TC-02** — Same scenario as SAKANI-41908-01; not automated twice. Its two extra asks are covered there: "hero banner promotional content" is asserted structurally, and "brand video modal display" is DEF-14
- **SAKANI-42321 TC-03** — Same scenario as an existing test; not automated twice
- **SAKANI-42321 TC-04** — Same scenario as an existing test; not automated twice
- **SAKANI-42321 TC-05** — Same scenario as an existing test; not automated twice
- **SAKANI-42321-07** — Multi-select is a union, not an intersection
- **SAKANI-42321-08** — Newsletter is published on the landing page only, not in the global footer

### SAKANI-42357 — Service template page rebranding (M1)

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| — | TC-01 | Validate Service Catalogue footer functionality | **Footer** | `tests/services/service-catalogue-rebranding.spec.ts` | guest | — | ↩︎ covered | — |
| — | TC-02 | Validate Service Search functionality | **Search bar** | `tests/services/service-catalogue-rebranding.spec.ts` | guest | — | ↩︎ covered | — |
| — | TC-03 | Validate Service Search and Filter functionality | **Filters** | `tests/services/service-catalogue-rebranding.spec.ts` | guest | — | ↩︎ covered | — |
| — | TC-04 | Validate Service Catalogue navigation and service cards | **Catalogue listing** | `tests/services/services.spec.ts` | guest | — | ↩︎ covered | — |
| SAKANI-42357-05 | TC-05 | Validate Service Details tabs functionality | **Service details tabs** | `tests/services/service-template.spec.ts`:18 | guest | — | ✅ Passed | — |
| SAKANI-42357-06 | TC-06 | Validate Related Services functionality | **Related services** | `tests/services/service-template.spec.ts`:50 | guest | — | ✅ Passed | — |
| SAKANI-42357-07 | TC-07 | Validate Service Rating functionality | **Page rating** | `tests/services/service-template.spec.ts`:91 | guest | @submits-data | ✅ Passed | — |
| SAKANI-42357-08 | TC-08 | Validate Service Details templates and section functionality | **Detail templates & sections** | `tests/services/service-template.spec.ts`:129 | guest | — | ✅ Passed | — |
| SAKANI-42357-09 | TC-09 | Validate Service Details navigation and content display | **Breadcrumb & content** | `tests/services/service-template.spec.ts`:177 | guest | — | ✅ Passed | — |

- **SAKANI-42357 TC-01** — Same scenario as an existing test; not automated twice
- **SAKANI-42357 TC-02** — Same scenario as an existing test; not automated twice
- **SAKANI-42357 TC-03** — Same scenario as an existing test; not automated twice
- **SAKANI-42357 TC-04** — Same scenario as an existing test; not automated twice
- **SAKANI-42357-06** — Passed cleanly in the 2026-08-31 regression; an earlier run lost it to a Chromium crash at context creation

### SAKANI-43048 — SSO login layout — 50/50 split

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-43048-01 | TC-01 | Verify buttons and input fields function normally | **Layout (50/50 split)** | `tests/auth/sso-login-layout.spec.ts`:16 | guest | — | ✅ Passed | — |

### SAKANI-47569 — Dashboard by nationality (M2)

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-47569-01 | TC-01 | Verify Saudi users continue to see the full dashboard | **Dashboard overview** | `tests/profile/dashboard-nationality.spec.ts`:22 | authenticated | — | ✅ Passed | — |
| SAKANI-47569-02 | TC-02 | Verify the dashboard displays only two cards for Non-Saudi users | **Dashboard overview** | `tests/profile/dashboard-nationality.spec.ts`:53 | authenticated | — | ✅ Passed | — |
| SAKANI-47569-03 | TC-03 | Verify the "service limited to nationals only" pop up appears for non-Saudi users | **Eligibility gate** | `tests/profile/dashboard-nationality.spec.ts`:111 | authenticated | — | ✅ Passed | — |

- **SAKANI-47569-02** — Non-Saudi identity supplied 2026-08-30 (an iqama holder). The two cards kept are the mortgage service and its calculator; the advisory service and everything tied to housing-support eligibility is withheld. Both this and TC-03 sign in for themselves and **skip** where `SAKANI_NON_SAUDI_NATIONAL_ID` is unset, so a machine or pipeline without that credential silently loses them — they ran and passed in the 2026-08-31 regression
- **SAKANI-47569-03** — Gate confirmed: "خدمة خاصة بالمواطنين — هذه الخدمة متاحة للمواطنين السعوديين فقط في الوقت الحالي." and the service never opens

## Pre-existing coverage

### SAKANI-46024 — Login page

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46024-01 | — | Validate the content of login page | **Login form** | `tests/auth/login.spec.ts`:13 | guest | — | ✅ Passed | — |
| SAKANI-46024-02 | — | Check the user ability to login | **Nafath journey** | `tests/auth/login.spec.ts`:41 | guest | — | ✅ Passed | — |
| SAKANI-46024-03 | — | Login returns the user to the page they started from | **Return URL** | `tests/auth/login.spec.ts`:83 | guest | — | ❌ Failed | DEF-01 |

- **SAKANI-46024-03** — Login discards returnUrl and lands on /app/error

### SAKANI-46035 — Error pages

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46035-01 | — | The rebranded 404 page renders its content | **404 page** | `tests/errors/not-found.spec.ts`:13 | guest | — | ✅ Passed | — |
| SAKANI-46035-02 | — | Check the navigation to wrong URL lands to 404 not found page | **Unknown URL handling** | `tests/errors/not-found.spec.ts`:27 | guest | — | ❌ Failed | DEF-07 |

- **SAKANI-46035-02** — Unknown URL falls back to the pre-rebranding 404 template

### SAKANI-46026 — Landing page

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46026-01 | TC-01 | Validate the landing page components (login button, search bar) | **Navigation** | `tests/landing/landing.spec.ts`:14 | guest | — | ✅ Passed | — |
| SAKANI-46026-02 | — | Landing page search bar accepts a city and keeps its controls enabled | **Hero Section** | `tests/landing/landing.spec.ts`:41 | guest | — | ✅ Passed | — |
| SAKANI-46026-03 | — | Cookie consent banner is presented and records the choice | **Cookie consent** | `tests/landing/landing.spec.ts`:58 | guest | — | ✅ Passed | — |

### SAKANI-46031 — Executive regulations

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46031-01 | — | Check the navigation to the page and check all the headings are clickable | **Document headings** | `tests/legal/executive-regulations.spec.ts`:8 | guest | — | ✅ Passed | — |

### SAKANI-46030 — Terms and conditions

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46030-01 | — | Check the navigation to the page and check all the headings are clickable | **Document headings** | `tests/legal/terms-and-conditions.spec.ts`:11 | guest | — | ✅ Passed | — |

### SAKANI-46231 — News

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46231-01 | — | Check the functionality of sort | **Sort** | `tests/news/news.spec.ts`:11 | guest | — | ✅ Passed | — |
| SAKANI-46231-02 | — | Check the functionality of read more button | **Article detail** | `tests/news/news.spec.ts`:43 | guest | — | ✅ Passed | — |
| SAKANI-46231-03 | — | Check pagination | **Pagination** | `tests/news/news.spec.ts`:67 | guest | — | ✅ Passed | — |
| SAKANI-46231-04 | — | The news page is reachable from the footer | **Footer** | `tests/news/news.spec.ts`:93 | guest | — | ✅ Passed | — |

### SAKANI-46375 — Reports

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46375-01 | — | Check the user ability to reach the reports (Sakani Reports, Residential Outreach, Residential Program Book) | **Category tabs** | `tests/reports/reports.spec.ts`:15 | guest | — | ✅ Passed | — |
| SAKANI-46375-02 | — | Check the functionality of all the sorting and clear | **Sort panel** | `tests/reports/reports.spec.ts`:30 | guest | — | ✅ Passed | — |
| SAKANI-46375-03 | — | Check the user ability to preview the report | **Report preview** | `tests/reports/reports.spec.ts`:89 | guest | — | ✅ Passed | — |
| SAKANI-46375-04 | — | Check the user should not be able to select more than 1 sort option | **Sort panel** | `tests/reports/reports.spec.ts`:145 | guest | — | ❌ Failed | DEF-06 |
| SAKANI-46375-05 | — | Reports pagination | **Pagination** | `tests/reports/reports.spec.ts`:171 | guest | — | ✅ Passed | — |
| SAKANI-46375-06 | — | The report preview control is translated | **Report preview** | `tests/reports/reports.spec.ts`:125 | guest | — | ❌ Failed | DEF-05 |

- **SAKANI-46375-04** — Sort options are exclusive within a group but not across groups
- **SAKANI-46375-06** — Preview control renders the raw key report_preview

### SAKANI-46230 — Global search

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46230-01 | — | Check the ability to search for a project/service | **Search modal** | `tests/search/global-search.spec.ts`:12 | guest | — | ✅ Passed | — |
| SAKANI-46230-02 | — | Check the functionality of see all results | **Search results page** | `tests/search/global-search.spec.ts`:43 | guest | — | ✅ Passed | — |

### SAKANI-46022 — Service catalogue

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46022-01 | — | Check the user ability to navigate to services page | **Navigation** | `tests/services/services.spec.ts`:16 | guest | — | ✅ Passed | — |
| SAKANI-46022-02 | — | Validate the availability of all the services on services page | **Catalogue listing** | `tests/services/services.spec.ts`:38 | guest | — | ✅ Passed | — |
| SAKANI-46022-03 | — | Services catalogue search narrows the listing | **Search bar** | `tests/services/services.spec.ts`:64 | guest | — | ✅ Passed | — |

### SAKANI-46873 — Contact us

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46873-01 | — | Check the user ability to navigate to contact us page and validate the content | **Form content** | `tests/support/contact-us.spec.ts`:21 | guest | — | ✅ Passed | — |
| SAKANI-46873-02 | — | Check the ability to send an inquiry | **Inquiry submission** | `tests/support/contact-us.spec.ts`:49 | guest | @submits-data | ✅ Passed | — |
| SAKANI-46873-03 | — | Check the ability to send a complaint | **Complaint submission** | `tests/support/contact-us.spec.ts`:73 | guest | @submits-data | ❌ Failed | DEF-08 |
| SAKANI-46873-04 | — | Check the ability to send proposal | **Proposal submission** | `tests/support/contact-us.spec.ts`:115 | guest | @submits-data | ✅ Passed | — |
| SAKANI-46873-05 | — | Submission confirmation matches the request type and returns a request id | **Submission confirmation** | `tests/support/contact-us.spec.ts`:144 | guest | @submits-data | ❌ Failed | DEF-03 |

- **SAKANI-46873-03** — Guest choosing a complaint is redirected to the account login
- **SAKANI-46873-05** — An inquiry is confirmed as a suggestion; requestId returns null (DEF-04)

### SAKANI-46872 — FAQs

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46872-01 | — | Check functionality of search/category and reset | **Filters** | `tests/support/faqs.spec.ts`:11 | guest | — | ✅ Passed | — |
| SAKANI-46872-02 | — | Check the pagination | **Pagination** | `tests/support/faqs.spec.ts`:46 | guest | — | ✅ Passed | — |
| SAKANI-46872-03 | — | Check the details expansion arrow functionality | **Question accordion** | `tests/support/faqs.spec.ts`:75 | guest | — | ✅ Passed | — |

### SAKANI-46029 — Help and support

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46029-01 | — | Check the user ability to reach to help and support page | **Navigation** | `tests/support/help-and-support.spec.ts`:9 | guest | — | ✅ Passed | — |
| SAKANI-46029-02 | — | Check availability of the content | **Channel cards** | `tests/support/help-and-support.spec.ts`:31 | guest | — | ✅ Passed | — |
| SAKANI-46029-03 | — | Check the navigation to Complaints guide | **Complaints guide** | `tests/support/help-and-support.spec.ts`:52 | guest | — | ✅ Passed | — |
| SAKANI-46029-04 | — | Check the navigation to Report a suspicion of corruption page | **Corruption reporting** | `tests/support/help-and-support.spec.ts`:71 | guest | — | ✅ Passed | — |
| SAKANI-46029-05 | — | Check the navigation to Contact Us Page | **Contact-us card** | `tests/support/help-and-support.spec.ts`:80 | guest | — | ❌ Failed | DEF-02 |
| SAKANI-46029-06 | — | Check the navigation to FAQs page | **FAQs card** | `tests/support/help-and-support.spec.ts`:102 | guest | — | ✅ Passed | — |
| SAKANI-46029-07 | — | Validate the availability of Comprehensive locations section | **Locations carousel** | `tests/support/help-and-support.spec.ts`:113 | guest | — | ✅ Passed | — |
| SAKANI-46029-08 | — | Check the functionality of View Direction for (Jeddah, Khobar, Madina, Riyadh) | **Locations carousel** | `tests/support/help-and-support.spec.ts`:120 | guest | — | ✅ Passed | — |
| SAKANI-46029-09 | — | Check the functionality of arrows in Comprehensive locations section | **Locations carousel** | `tests/support/help-and-support.spec.ts`:137 | guest | — | ✅ Passed | — |

- **SAKANI-46029-05** — Support hub leads to the legacy /support-and-help/contact-us

### SAKANI-46032 — Profile

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| SAKANI-46032-01 | — | Check the navigation to profile | **Profile navigation** | `tests/profile/profile.spec.ts`:12 | authenticated | — | ✅ Passed | — |
| SAKANI-46032-02 | — | Check the functionality of all the available options in the profile | **Profile side menu** | `tests/profile/profile.spec.ts`:30 | authenticated | — | ❌ Failed | DEF-09 |

- **SAKANI-46032-02** — Profile "المساعدة والدعم" lands on /app/error

### setup — Setup

| Test ID | Case | Test case name | Section | Spec file | Project | Tags | Result | Defect |
|---|---|---|---|---|---|---|---|---|
| auth.setup | — | authenticate beta session | **Session setup** | `tests/setup/auth.setup.ts`:26 | setup | — | ✅ Passed | — |

## Sections at a glance

| Section | Test cases |
|---|---|
| 404 page | SAKANI-46035-01 |
| Article detail | SAKANI-46231-02 |
| Breadcrumb & content | SAKANI-42357-09 |
| Catalogue listing | SAKANI-46022-02, SAKANI-42357 TC-04 |
| Category tabs | SAKANI-46375-01 |
| Channel cards | SAKANI-46029-02 |
| Complaint submission | SAKANI-46873-03 |
| Complaints guide | SAKANI-46029-03 |
| Consent links | SAKANI-41917-01 |
| Contact-us card | SAKANI-46029-05 |
| Cookie consent | SAKANI-46026-03 |
| Corruption reporting | SAKANI-46029-04 |
| Dashboard overview | SAKANI-47569-01, SAKANI-47569-02 |
| Detail templates & sections | SAKANI-42357-08 |
| Document headings | SAKANI-46031-01, SAKANI-46030-01 |
| Eligibility gate | SAKANI-47569-03 |
| FAQs card | SAKANI-46029-06 |
| Filters | SAKANI-42321-07, SAKANI-46872-01, SAKANI-42357 TC-03 |
| Footer | SAKANI-41908-05, SAKANI-41908-07, SAKANI-46231-04, SAKANI-42321-08, SAKANI-42357 TC-01 |
| Form content | SAKANI-46873-01 |
| Hero Section | SAKANI-41908-01, SAKANI-46026-02, SAKANI-42321 TC-02 |
| Inquiry submission | SAKANI-46873-02 |
| Key Metrics | SAKANI-41908-04, SAKANI-42321 TC-05 |
| Layout (50/50 split) | SAKANI-43048-01 |
| Locations carousel | SAKANI-46029-07, SAKANI-46029-08, SAKANI-46029-09 |
| Login form | SAKANI-46024-01 |
| Login validation | SAKANI-41917-03 |
| Nafath journey | SAKANI-46024-02 |
| Navigation | SAKANI-41908-06, SAKANI-46026-01, SAKANI-46022-01, SAKANI-46029-01, SAKANI-42321-01 |
| Page copy | SAKANI-41917-02 |
| Page rating | SAKANI-42357-07 |
| Pagination | SAKANI-46231-03, SAKANI-46375-05, SAKANI-46872-02 |
| Products | SAKANI-41908-02, SAKANI-42321 TC-03 |
| Profile navigation | SAKANI-46032-01 |
| Profile side menu | SAKANI-46032-02 |
| Proposal submission | SAKANI-46873-04 |
| Question accordion | SAKANI-46872-03 |
| Related services | SAKANI-42357-06 |
| Report preview | SAKANI-46375-03, SAKANI-46375-06 |
| Return URL | SAKANI-46024-03 |
| Scenarios & Links | SAKANI-41908-03, SAKANI-42321 TC-04 |
| Search bar | SAKANI-42321-06, SAKANI-46022-03, SAKANI-42357 TC-02 |
| Search modal | SAKANI-46230-01, SAKANI-41908 TC-02 (review) |
| Search results page | SAKANI-46230-02 |
| Service details tabs | SAKANI-42357-05 |
| Session setup | auth.setup |
| Sort | SAKANI-46231-01 |
| Sort panel | SAKANI-46375-02, SAKANI-46375-04 |
| Submission confirmation | SAKANI-46873-05 |
| Unknown URL handling | SAKANI-46035-02 |
