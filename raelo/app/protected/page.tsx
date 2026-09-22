import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    redirect("/auth/login");
  }

  const { data: onboarding } = await supabase
    .from("onboarding_responses")
    .select("completed")
    .eq("user_id", user.sub as string)
    .maybeSingle();

  if (!onboarding?.completed) {
    redirect("/onboarding");
  }

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, status, package_id")
    .eq("user_id", user.sub as string)
    .order("created_at", { ascending: false });

  const activeSubscription = subscriptions?.find((s) => s.status === "active");

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="w-full rounded-2xl bg-accent p-6">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {activeSubscription
            ? "Your subscription is active. The full client dashboard (content library, delivery status, account) is coming in the next build phase."
            : "You don't have an active subscription yet. Choose a package from the landing page to get started."}
        </p>
      </div>

      {!activeSubscription && (
        <a
          href="/#packages"
          className="inline-block w-fit rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
        >
          Choose a package
        </a>
      )}
    </div>
  );
}
