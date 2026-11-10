import { test, expect, Products } from '@fixtures/pages.fixture';
import { API, CONTACT_LEAD, INQUIRY_SUB_TYPES, REQUEST_TYPES, ROUTES, TEST_USER } from '@data/testData';
import { logStep } from '@helpers/LogSteps';

/**
 * SAKANI-46873 — Contact us.
 *
 * The three submission cases create real records in the beta support inbox.
 * The manual scenario explicitly calls for sending an inquiry, a complaint and
 * a proposal, so they are automated as written; every payload is self-labelled
 * "QA AUTOMATION TEST" so a human reading the inbox can see where it came from.
 * They are tagged `@submits-data` so a run can exclude them with
 * `--grep-invert @submits-data` when the environment must stay clean.
 */
test.describe('SAKANI-46873 - Contact us', () => {
  /**
   * The in-product route to this form is the support hub's "راسلنا" card, which
   * is exercised by SAKANI-46029-05 — including the fact that beta still points
   * it at the pre-rebranding page (DEF-02). It is not repeated here, so this
   * case reports purely on the form's own content.
   */
  test(
    'SAKANI-46873-01 - Check the user ability to navigate to contact us page and validate the content',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ contactUsPage, page }) => {
      await logStep('Step 01: the rebranded contact form renders every field');
      await contactUsPage.open();
      await expect(page).toHaveURL(new RegExp(`${ROUTES.contactUs}$`));
      await contactUsPage.expectFormRendered();

      await logStep('Step 02: submit stays disabled until the form is filled');
      await expect(contactUsPage.submitButton).toBeDisabled();

      await logStep('Step 03: the request type offers inquiry, proposal and complaint');
      const options = await contactUsPage.requestTypeOptions();
      expect(options).toEqual(expect.arrayContaining([REQUEST_TYPES.inquiry, REQUEST_TYPES.proposal, REQUEST_TYPES.complaint]));
      expect(options).toHaveLength(3);

      await logStep('Step 04: choosing an inquiry reveals a dependent inquiry-type select');
      await contactUsPage.selectRequestType(REQUEST_TYPES.inquiry);
      expect(await contactUsPage.hasInquirySubType()).toBe(true);
    }
  );

  test('SAKANI-46873-02 - Check the ability to send an inquiry @submits-data', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ contactUsPage, page }) => {
    const posted: number[] = [];
    page.on('response', (response) => {
      if (response.url().includes(API.contactUsForm)) posted.push(response.status());
    });

    await contactUsPage.open();
    await contactUsPage.selectRequestType(REQUEST_TYPES.inquiry);

    await logStep('Step 01: choosing an inquiry reveals the dependent inquiry-type select');
    expect(await contactUsPage.hasInquirySubType()).toBe(true);

    await contactUsPage.fill({
      requestType: REQUEST_TYPES.inquiry,
      inquirySubType: INQUIRY_SUB_TYPES[0],
      message: CONTACT_LEAD.message('inquiry'),
    });
    await contactUsPage.submit();

    await contactUsPage.expectSubmitted('inquiry');
    expect(posted, `POST ${API.contactUsForm} should have succeeded`).toContain(200);
  });

  test(
    'SAKANI-46873-03 - Check the ability to send a complaint @submits-data',
    { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] },
    async ({ contactUsPage, page, loginPage }) => {
      const posted: number[] = [];
      page.on('response', (response) => {
        if (response.url().includes(API.contactUsForm)) posted.push(response.status());
      });

      await contactUsPage.open();
      await contactUsPage.selectRequestType(REQUEST_TYPES.complaint);

      await loginPage.enterIdentifier(TEST_USER.nationalId);
      await loginPage.submitIdentifier();

      await logStep('Step 01: the Nafath modal opens with the identifier pre-filled');
      await expect(loginPage.nafathModalHeading).toBeVisible({ timeout: 90_000 });
      await expect(loginPage.nafathModalIdInput).toHaveValue(TEST_USER.nationalId);

      await loginPage.confirmNafath();
      await loginPage.waitForAuthenticated();

      await logStep('Step 02: a complaint needs no dependent sub-type');
      expect(await contactUsPage.hasInquirySubType()).toBe(false);

      /**
       * Choosing "شكوى" takes the form away from a guest: the app appends
       * `?type=complaint`, then redirects to
       * `/app/authentication/login?external=true&returnUrl=…`, raising "Cannot run
       * Javascript Detection, it requires a document body" on the way. Choosing
       * "استفسار" or "اقتراح" on the same form submits without a session, so the
       * gate is specific to this request type and is not announced anywhere in the
       * form. The manual case asks a guest to send a complaint, so the assertion
       * states that; it is expected to fail while the defect is open (DEF-08).
       */
      await logStep('Step 03: the form is still usable after choosing a complaint');
      expect(page.url(), 'a guest choosing "شكوى" should stay on the contact form; beta redirects to the account ' + `login instead (${page.url()}) (DEF-08)`).not.toMatch(
        /\/app\/authentication\/login/
      );
      await contactUsPage.expectFormUsable();

      await contactUsPage.fill({
        requestType: REQUEST_TYPES.complaint,
        message: CONTACT_LEAD.message('complaint'),
      });

      await contactUsPage.submit();

      await contactUsPage.expectSubmitted('complaint');
      expect(posted, `POST ${API.contactUsForm} should have succeeded`).toContain(200);
    }
  );

  test('SAKANI-46873-04 - Check the ability to send proposal @submits-data', { annotation: [{ product: Products.Rebranding, type: 'non-critical' } as any] }, async ({ contactUsPage, page }) => {
    const posted: number[] = [];
    page.on('response', (response) => {
      if (response.url().includes(API.contactUsForm)) posted.push(response.status());
    });

    await contactUsPage.open();
    await contactUsPage.selectRequestType(REQUEST_TYPES.proposal);

    await logStep('Step 01: a proposal needs no dependent sub-type');
    expect(await contactUsPage.hasInquirySubType()).toBe(false);

    await contactUsPage.fill({
      requestType: REQUEST_TYPES.proposal,
      message: CONTACT_LEAD.message('proposal'),
    });
    await contactUsPage.submit();

    await contactUsPage.expectSubmitted('proposal');
    expect(posted, `POST ${API.contactUsForm} should have succeeded`).toContain(200);
  });
});
