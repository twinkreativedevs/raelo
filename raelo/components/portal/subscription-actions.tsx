"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { renewNow, setAutoRenew } from "@/app/portal/billing/actions";

export function SubscriptionActions({
  subscriptionId,
  autoRenew,
  hasCard,
  canRenew,
}: {
  subscriptionId: string;
  autoRenew: boolean;
  hasCard: boolean;
  canRenew: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRenew = async () => {
    setError(null);
    setIsRedirecting(true);
    const result = await renewNow(subscriptionId);
    if (result.url) {
      window.location.href = result.url;
      return;
    }
    setError(result.error ?? "Something went wrong.");
    setIsRedirecting(false);
  };

  const handleToggle = () => {
    setError(null);
    startTransition(async () => {
      const result = await setAutoRenew(subscriptionId, !autoRenew);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canRenew && (
        <Button size="sm" onClick={handleRenew} disabled={isRedirecting}>
          {isRedirecting ? "Redirecting…" : "Renew now"}
        </Button>
      )}
      {hasCard && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleToggle}
          disabled={isPending}
        >
          {autoRenew ? "Turn off auto-renew" : "Turn on auto-renew"}
        </Button>
      )}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
