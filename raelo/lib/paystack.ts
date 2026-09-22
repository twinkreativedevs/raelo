// Reusable Paystack service module. All Paystack HTTP calls go through
// here so the rest of the app never talks to the Paystack API directly.
// Server-only: relies on PAYSTACK_SECRET_KEY, which must never be exposed
// to the browser (no NEXT_PUBLIC_ prefix).

const PAYSTACK_BASE_URL = "https://api.paystack.co";

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

export interface VerifyTransactionResult {
  status: PaystackVerificationStatus;
  reference: string;
  /** Amount actually paid, in kobo. */
  amount: number;
  currency: string;
  paid_at: string | null;
  customer: { email: string };
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
