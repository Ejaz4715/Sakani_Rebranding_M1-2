import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { Header } from './components/Header';
import { CONTACT_LEAD, CONTACT_SUCCESS_SUBJECT, REQUEST_TYPES, ROUTES } from '@data/testData';

export interface ContactSubmission {
  requestType: string;
  /** Only "استفسار" exposes a dependent sub-type select. */
  inquirySubType?: string;
  message: string;
}

/**
 * The rebranded Contact-us form —
 * `/rebranding-support-and-help/rebranding-contact-us`.
 *
 * Every control is a `sakani-wc-*` web component. Two consequences shape the
 * locators here:
 *
 *  - the host element mirrors `placeholder` onto itself, so `getByPlaceholder`
 *    matches both the host and the real `<input>`; the textbox role resolves to
 *    the input alone.
 *  - only "نوع الطلب", "المنطقة", "المدينة" and the message textarea are wired
 *    to a `<label for=…>`. The identity, name, phone and email fields are not,
 *    so they are addressed by placeholder text (reported as an accessibility
 *    finding).
 *
 * The form is dependent in two places: choosing "استفسار" reveals a required
 * "نوع الاستفسار" select, and "المدينة" stays disabled until a region is
 * chosen.
 */
export class ContactUsPage extends BasePage {
  protected readonly path = ROUTES.contactUs;

  readonly header: Header;

  readonly title: Locator;
  readonly intro: Locator;

  readonly requestTypeSelect: Locator;
  readonly complaintTypeSelect: Locator;
  readonly complaintTypeOption: Locator;
  readonly regionControl: Locator;
  readonly cityControl: Locator;
  readonly requestTypeTrigger: Locator;
  readonly inquiryTypeTrigger: Locator;

  readonly nationalIdInput: Locator;
  readonly nameInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;
  readonly regionSelect: Locator;
  readonly citySelect: Locator;
  readonly messageInput: Locator;
  readonly submitButton: Locator;
  readonly recaptchaNotice: Locator;

  /** Success screen. */
  readonly successHeading: Locator;
  readonly successDoneButton: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new Header(page);

    this.title = page.getByText('راسلنا', { exact: true }).first();
    this.intro = page.getByText(/الرجاء اختيار نوع الطلب وتعبئة النموذج/).first();

    // ng-select keeps its real `<input>` visually hidden until focused, so the
    // control host is what a visibility assertion has to look at. The inputs
    // (`#subject`, `#region`, `#city`) stay the interaction targets.
    this.requestTypeSelect = page.locator('sakani-wc-select[field-id="subject"]');
    this.complaintTypeSelect = page.locator("//label[@for ='complaint_type']/parent::div/descendant::div[text() = 'حدد نوع الشكوى']");
    this.complaintTypeOption = page.locator("//div[text()= 'شكوى أخرى']");
    this.regionControl = page.locator('sakani-wc-select[field-id="region"]');
    this.cityControl = page.locator('sakani-wc-select[field-id="city"]');
    this.requestTypeTrigger = page.getByText('اختر نوع الطلب', { exact: true }).first();
    this.inquiryTypeTrigger = page.getByText('حدد نوع الاستفسار', { exact: true }).first();

    this.nationalIdInput = page.getByRole('textbox', { name: 'أدخل رقم الهوية' });
    this.nameInput = page.getByRole('textbox', { name: 'أدخل اسم المستفيد' });
    this.phoneInput = page.getByRole('textbox', { name: '5xxxxxxxxxx' });
    this.emailInput = page.getByRole('textbox', { name: 'أدخل عنوان البريد الإلكتروني' });
    this.regionSelect = page.locator('#region');
    this.citySelect = page.locator('#city');
    this.messageInput = page.locator('#message');
    this.submitButton = page.locator('button[type="submit"]').filter({ hasText: /^\s*إرسال\s*$/ }).first();
    this.recaptchaNotice = page.getByText(/reCAPTCHA/i).first();

    this.successHeading = page.getByText(/^شكرا?ً\s/).first();
    this.successDoneButton = page.locator('button').filter({ hasText: /^\s*منتهي\s*$/ }).first();
  }

  async open(): Promise<void> {
    await this.gotoUntilReady(this.messageInput);
  }

  private option(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true }).first();
  }

  async expectFormRendered(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.intro).toBeVisible();
    await expect(this.requestTypeSelect).toBeVisible();
    await expect(this.nationalIdInput).toBeVisible();
    await expect(this.nameInput).toBeVisible();
    await expect(this.phoneInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.regionControl).toBeVisible();
    await expect(this.cityControl).toBeVisible();
    await expect(this.messageInput).toBeVisible();

    // The city list is loaded per region, so it starts disabled.
    await expect(this.citySelect).toBeDisabled();
    await expect(this.submitButton).toBeVisible();
    await expect(this.recaptchaNotice).toBeVisible();
  }

  /**
   * Open the request-type select, read the options it offers, and close it
   * again so the caller is left with the form in its original state.
   */
  async requestTypeOptions(): Promise<string[]> {
    await this.requestTypeTrigger.click();
    await expect(this.option(REQUEST_TYPES.inquiry)).toBeVisible();
    const options = (await this.page.getByRole('option').allInnerTexts()).map((text) => text.trim());
    await this.page.keyboard.press('Escape');
    await expect(this.option(REQUEST_TYPES.inquiry)).toBeHidden();
    return options;
  }

  /** The request-type control, used to read back what is currently selected. */
  private requestTypeControl(): Locator {
    return this.page.locator('sakani-wc-select[field-id="subject"]');
  }

  /**
   * Choose a request type, or do nothing if it is already chosen.
   *
   * Idempotent on purpose: the journeys select a type to check whether a
   * dependent sub-type appears, then fill the rest of the form, which selects
   * again. A second click would miss — once a value is chosen the
   * "اختر نوع الطلب" placeholder is replaced by the selected label, so the
   * trigger the first call used no longer exists.
   *
   * The selection cannot be read from the input's `value` (ng-select keeps the
   * input empty and renders the label separately), so the control's own text is
   * the readable signal.
   */
  async selectRequestType(type: string): Promise<void> {
    if ((await this.requestTypeControl().count()) > 0 && (await this.requestTypeControl().innerText()).includes(type)) {
      return;
    }
    await this.requestTypeTrigger.click();
    await this.option(type).click();

    // Wait for the form to settle by watching the placeholder disappear, which
    // happens whichever way the app reacts. Asserting the control now shows the
    // chosen type would be wrong here: selecting "شكوى" navigates a guest away
    // to the account login (DEF-08), and this method would then fail with an
    // opaque "element not found" instead of letting the caller name the defect.
    await expect
      .poll(async () => this.requestTypeTrigger.isVisible().catch(() => false), { timeout: 30_000 })
      .toBe(false);
  }

  /**
   * Assert the form is still filled-in-able after a request type is chosen.
   *
   * Selecting a type re-renders the form to add or remove dependent fields.
   * Choosing "شكوى" as a guest instead navigates to the account login, so none
   * of these fields exist any more (DEF-08).
   */
  async expectFormUsable(): Promise<void> {
    await expect(this.nationalIdInput).toBeVisible();
    await expect(this.nameInput).toBeVisible();
    await expect(this.phoneInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.regionControl).toBeVisible();
    await expect(this.cityControl).toBeVisible();
    await expect(this.messageInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async selectInquiryType(type: string): Promise<void> {
    await expect(this.inquiryTypeTrigger).toBeVisible();
    await this.inquiryTypeTrigger.click();
    await this.option(type).click();
  }

  /** True when the dependent "نوع الاستفسار" select is on the page. */
  async hasInquirySubType(): Promise<boolean> {
    return this.inquiryTypeTrigger.isVisible().catch(() => false);
  }

  async selectRegion(region: string): Promise<void> {
    await this.regionSelect.click();
    await this.option(region).click();
    // The city list is loaded per region; it stays disabled until that lands.
    await expect(this.citySelect).toBeEnabled({ timeout: 45_000 });
  }

  async selectCity(city: string): Promise<void> {
    await this.citySelect.click();
    await this.option(city).click();
  }

  /** Fill every field the form requires for the given request type. */
  async fill(submission: ContactSubmission): Promise<void> {
    await this.selectRequestType(submission.requestType);
    if (submission.inquirySubType) await this.selectInquiryType(submission.inquirySubType);

    // await this.nationalIdInput.fill(CONTACT_LEAD.nationalId);
    // await this.nameInput.fill(CONTACT_LEAD.name);
    // await this.phoneInput.fill(CONTACT_LEAD.phone);
    // await this.emailInput.fill(CONTACT_LEAD.email);

    if (await this.nationalIdInput.isEnabled()) {
      await this.nationalIdInput.fill(CONTACT_LEAD.nationalId);
    }

    if (await this.nameInput.isEnabled()) {
      await this.nameInput.fill(CONTACT_LEAD.name);
    }

    if (await this.phoneInput.isEnabled()) {
      await this.phoneInput.fill(CONTACT_LEAD.phone);
    }

    if (await this.emailInput.isEnabled()) {
      await this.emailInput.fill(CONTACT_LEAD.email);
    }
    await this.page.getByText('حدد نوع الشكوى').click();
    await this.page.getByText('شكوى أخرى').click();
    await this.selectRegion(CONTACT_LEAD.region);
    await this.selectCity(CONTACT_LEAD.city);
    await this.messageInput.fill(submission.message);
  }

  async submit(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }

  /**
   * Wait for the success screen.
   *
   * The application signals success by navigating to
   * `…/rebranding-contact-us/success?subject=<kind>&requestId=…`.
   */
  async expectSubmitted(kind: keyof typeof CONTACT_SUCCESS_SUBJECT): Promise<void> {
    await this.page.waitForURL(
      new RegExp(`${ROUTES.contactUsSuccess.replace(/\//g, '\\/')}\\?.*subject=${CONTACT_SUCCESS_SUBJECT[kind]}`),
      { timeout: 90_000 },
    );
    await expect(this.successHeading).toBeVisible();
    await expect(this.successDoneButton).toBeVisible();
  }

  /** The `requestId` the success URL reports, or `null` when absent. */
  requestIdFromUrl(): string | null {
    const value = new URL(this.page.url()).searchParams.get('requestId');
    return value === null || value === 'null' ? null : value;
  }
}
