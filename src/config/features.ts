/**
 * Feature flags.
 *
 * SUBSCRIPTION_ENABLED — temporarily turned OFF for the Play Store review.
 * While false, the subscribe/upgrade UI, the plans page and all upgrade nudges
 * are hidden and the /subscribe route redirects home. None of the underlying
 * subscription logic (Razorpay, webhooks, entitlement checks) is affected, so
 * existing subscribers keep full access. Turn this back on in December.
 */
export const SUBSCRIPTION_ENABLED = false;

/**
 * PARAYANAM_PAYMENTS_ENABLED — temporarily turned OFF because Razorpay is
 * verifying the narayaneeyam.app domain for live payments (submitted 2 Sep,
 * awaiting approval). While false, PAID parayanam invites show a maintenance
 * message instead of the in-app "Pay to Join" button. Re-enable once approved.
 */
export const PARAYANAM_PAYMENTS_ENABLED = false;
