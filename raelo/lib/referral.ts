// Referral cookie constants, dependency-free so the proxy can use them.
export const REF_COOKIE = "raelo_ref";
export const REF_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{2,31}$/;
/** Hard cap; the configurable window (settings.affiliate.cookie_days) is checked at checkout. */
export const REF_COOKIE_MAX_DAYS = 365;
