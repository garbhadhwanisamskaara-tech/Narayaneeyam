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
