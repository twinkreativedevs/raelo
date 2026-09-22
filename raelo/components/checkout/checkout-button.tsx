"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { initCheckout } from "@/app/checkout/actions";

export function CheckoutButton({
  packageId,
  packageName,
}: {
  packageId: string;
  packageName: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    const result = await initCheckout(packageId);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    if (result.url) {
      window.location.href = result.url;
      return;
    }

    setIsLoading(false);
  };

  return (
    <div>
      <Button
        onClick={handleCheckout}
        disabled={isLoading}
        className="w-full rounded-full bg-red-600 py-6 text-base font-semibold text-white hover:bg-red-700"
      >
        {isLoading ? "Redirecting to payment..." : `Pay for ${packageName}`}
      </Button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
