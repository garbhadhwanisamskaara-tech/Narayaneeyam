/**
 * Feature flags.
 *
 * SUBSCRIPTION_ENABLED — temporarily turned OFF for the Play Store review.
 * While false, the subscribe/upgrade UI, the plans page and all upgrade nudges
 * are hidden and the /subscribe route redirects home. None of the underlying
 * subscription logic (Razorpay, webhooks, entitlement checks) is affected, so
 * existing subscribers keep full access.
 *
 * KEEP FALSE PERMANENTLY. Access is now decided by the server (get_my_access /
 * feature_gates). Turning this on would bring back old screens with
 * "subscribe" / "trial" wording, which must never appear in the app.
 */
export const SUBSCRIPTION_ENABLED = false;

/**
 * Legacy flag kept disabled. Member parayanam flows use server-owned approval
 * states only; checkout is not offered in the app on any platform.
 */
export const PARAYANAM_PAYMENTS_ENABLED = false;
