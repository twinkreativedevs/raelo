// Domain types for rows and their status/role unions. The column-level
// source of truth is lib/db/schema.ts (generated from db/migrations); these
// add the narrower literal types the database enforces with CHECK
// constraints, for use in components and server code.

export type ProfileRole =
  | "client"
  | "admin"
  | "account_manager"
  | "designer"
  | "content_creator"
  | "email_marketer"
  | "social_media_manager";
export type TeamRole = Exclude<ProfileRole, "client">;
/** Roles a team member can hold on a client's subscription. */
export type AssignmentRole = Exclude<TeamRole, "admin">;

export type AccountType = "individual" | "organization";

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "paused"
  | "cancelled"
  | "expired";

export type ContentItemStatus =
  | "requested"
  | "draft"
  | "review"
  | "approved"
  | "delivered";

export type ContentBatchStatus = "draft" | "published";

export type OrderKind = "new" | "renewal";
export type OrderStatus = "pending" | "paid" | "failed" | "abandoned" | "refunded";

export type InvoiceStatus = "paid" | "void";

export type AffiliateStatus = "pending" | "approved" | "rejected" | "suspended";
export type CommissionStatus = "earned" | "paid" | "void";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  account_type: AccountType;
  job_title: string | null;
  website: string | null;
  industry: string | null;
  team_size: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: string;
  deliverables: unknown;
  active: boolean;
  sort_order: number;
  is_popular: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  package_id: string;
  status: SubscriptionStatus;
  /** @deprecated Payment references live on `orders` since migration 0010. */
  payment_reference: string | null;
  started_at: string | null;
  expires_at: string | null;
  auto_renew: boolean;
  payment_method_id: string | null;
  renewal_failures: number;
  last_renewal_attempt_at: string | null;
  complimentary: boolean;
  created_at: string;
  updated_at: string;
}

/** Server-only: never select authorization_code into client code. */
export interface PaymentMethod {
  id: string;
  user_id: string;
  authorization_code: string;
  signature: string | null;
  email: string;
  customer_code: string | null;
  channel: string | null;
  card_type: string | null;
  brand: string | null;
  bank: string | null;
  last4: string | null;
  exp_month: string | null;
  exp_year: string | null;
  reusable: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaystackEvent {
  id: number;
  event: string;
  reference: string | null;
  payload: unknown;
  status: "received" | "processed" | "ignored" | "error";
  result: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface SubscriptionAssignment {
  id: string;
  subscription_id: string;
  profile_id: string;
  role: AssignmentRole;
  assigned_by: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  subscription_id: string;
  package_id: string;
  kind: OrderKind;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  discount_amount: number;
  amount: number;
  payment_reference: string;
  paystack_transaction_id: string | null;
  payment_channel: string | null;
  paid_at: string | null;
  failure_reason: string | null;
  affiliate_id: string | null;
  referral_code: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_amount: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  user_id: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  discount_amount: number;
  total: number;
  line_items: InvoiceLineItem[];
  billed_to_name: string | null;
  billed_to_email: string | null;
  billed_to_company: string | null;
  issued_at: string;
  created_at: string;
}

export interface OnboardingResponse {
  id: string;
  user_id: string;
  business_name: string | null;
  industry: string | null;
  target_audience: string | null;
  brand_voice: string | null;
  social_platforms: unknown;
  social_handles: unknown;
  brand_colors: string | null;
  competitors: string | null;
  content_goals: string | null;
  assets_url: string | null;
  logo_path: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentBatch {
  id: string;
  subscription_id: string;
  title: string;
  period_start: string | null;
  status: ContentBatchStatus;
  client_message: string | null;
  internal_notes: string | null;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  subscription_id: string;
  batch_id: string | null;
  title: string;
  description: string | null;
  content_type: string | null;
  platform: string | null;
  status: ContentItemStatus;
  asset_url: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  sort_order: number;
  caption: string | null;
  scheduled_for: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  metadata: unknown;
  created_at: string;
}

export interface Setting {
  key: string;
  value: unknown;
  is_public: boolean;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Affiliate {
  id: string;
  user_id: string;
  code: string;
  status: AffiliateStatus;
  discount_percent: number;
  commission_percent: number;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  application_note: string | null;
  admin_note: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Commission {
  id: string;
  affiliate_id: string;
  order_id: string;
  base_amount: number;
  rate_percent: number;
  amount: number;
  currency: string;
  status: CommissionStatus;
  payout_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  affiliate_id: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  notes: string | null;
  paid_at: string;
  recorded_by: string | null;
  created_at: string;
}

export interface AffiliateBalance {
  affiliate_id: string;
  user_id: string;
  confirmed_sales: number;
  earned_total: number;
  paid_total: number;
  unpaid_total: number;
  is_unlocked: boolean;
}

export interface NotificationLog {
  id: number;
  event: string;
  channel: "email" | "sms";
  recipient: string;
  user_id: string | null;
  dedupe_key: string | null;
  status: "sent" | "failed" | "skipped";
  provider_id: string | null;
  error: string | null;
  created_at: string;
}
