// Hand-written types matching supabase/migrations/0001-0006.
// If you have the Supabase CLI linked to your project, prefer regenerating
// this with:
//   supabase gen types typescript --linked > lib/supabase/database.types.ts
// and it will supersede this file (keep the same export shape).

export type ProfileRole = "client" | "admin";

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

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  role: ProfileRole;
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
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  package_id: string;
  status: SubscriptionStatus;
  payment_reference: string | null;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingResponse {
  id: string;
  user_id: string;
  business_name: string | null;
  industry: string | null;
  target_audience: string | null;
  brand_voice: string | null;
  social_platforms: unknown;
  brand_colors: string | null;
  competitors: string | null;
  content_goals: string | null;
  assets_url: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  subscription_id: string;
  title: string;
  description: string | null;
  content_type: string | null;
  platform: string | null;
  status: ContentItemStatus;
  asset_url: string | null;
  caption: string | null;
  scheduled_for: string | null;
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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      packages: {
        Row: Package;
        Insert: Partial<Package> & { name: string; slug: string; price: number };
        Update: Partial<Package>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Partial<Subscription> & { user_id: string; package_id: string };
        Update: Partial<Subscription>;
      };
      onboarding_responses: {
        Row: OnboardingResponse;
        Insert: Partial<OnboardingResponse> & { user_id: string };
        Update: Partial<OnboardingResponse>;
      };
      content_items: {
        Row: ContentItem;
        Insert: Partial<ContentItem> & { subscription_id: string; title: string };
        Update: Partial<ContentItem>;
      };
      activity_events: {
        Row: ActivityEvent;
        Insert: Partial<ActivityEvent> & { event_type: string };
        Update: Partial<ActivityEvent>;
      };
    };
  };
}
