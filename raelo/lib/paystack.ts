import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

// Reusable Paystack service module. All Paystack HTTP calls go through
// here so the rest of the app never talks to the Paystack API directly.
// Server-only: relies on PAYSTACK_SECRET_KEY, which must never be exposed
// to the browser (no NEXT_PUBLIC_ prefix).

// PAYSTACK_API_URL is only for tests/proxies.
const PAYSTACK_BASE_URL = process.env.PAYSTACK_API_URL ?? "https://api.paystack.co";

/** True once PAYSTACK_SECRET_KEY is set. Until then checkout is switched off. */
export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not set");
  }
  return key;
}

export interface InitializeTransactionParams {
  email: string;
  /** Amount in the smallest currency unit (kobo for NGN). */
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializeTransaction(
  params: InitializeTransactionParams,
): Promise<InitializeTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok || !json.status) {
    throw new Error(json.message || "Failed to initialize Paystack transaction");
  }

  return json.data as InitializeTransactionResult;
}

export type PaystackVerificationStatus = "success" | "failed" | "abandoned" | string;

export interface PaystackAuthorization {
  authorization_code: string;
  bin: string | null;
  last4: string | null;
  exp_month: string | null;
  exp_year: string | null;
  channel: string | null;
  card_type: string | null;
  bank: string | null;
  brand: string | null;
  reusable: boolean;
  signature: string | null;
}

export interface VerifyTransactionResult {
  id: number;
  status: PaystackVerificationStatus;
  /** e.g. "card", "bank", "ussd", "bank_transfer" */
  channel: string | null;
  reference: string;
  /** Amount actually paid, in kobo. */
  amount: number;
  currency: string;
  paid_at: string | null;
  customer: { email: string; customer_code?: string | null };
  authorization?: PaystackAuthorization | null;
}

export async function verifyTransaction(
  reference: string,
): Promise<VerifyTransactionResult> {
  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${getSecretKey()}` },
      cache: "no-store",
    },
  );

  const json = await res.json();

  if (!res.ok || !json.status) {
    throw new Error(json.message || "Failed to verify Paystack transaction");
  }

  return json.data as VerifyTransactionResult;
}

export interface ChargeAuthorizationParams {
  email: string;
  authorizationCode: string;
  /** Amount in the smallest currency unit (kobo for NGN). */
  amountKobo: number;
  reference: string;
  metadata?: Record<string, unknown>;
}

/**
 * Charges a saved card (recurring billing). Paystack answers synchronously
 * with the transaction; `status` is usually "success" or "failed", but can
 * be pending/processing, in which case the webhook completes it later.
 */
export async function chargeAuthorization(
  params: ChargeAuthorizationParams,
): Promise<VerifyTransactionResult & { gateway_response?: string }> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/charge_authorization`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      authorization_code: params.authorizationCode,
      reference: params.reference,
      metadata: params.metadata,
    }),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok || !json.status) {
    throw new Error(json.message || "Failed to charge authorization");
  }

  return json.data;
}

/**
 * Checks the `x-paystack-signature` header: an HMAC-SHA512 of the raw
 * request body keyed with our secret key. Must run on the exact bytes
 * received, before any JSON parsing.
 */
export function isValidWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature || !paystackConfigured()) return false;

  const expected = createHmac("sha512", getSecretKey())
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
