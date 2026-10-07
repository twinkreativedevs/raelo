"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { upload } from "@vercel/blob/client";

import { LOGO_EXTENSIONS, LOGO_MAX_BYTES } from "@/lib/logo-upload";
import { saveLogo } from "@/app/onboarding/actions";

/**
 * Uploads a logo straight from the browser to the private Blob store
 * (/api/uploads only signs uploads into the user's own
 * brand-assets/{userId}/ folder), then records the path on the brief.
 */
export function LogoUpload({
  userId,
  initialUrl,
}: {
  userId: string;
  initialUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(initialUrl ?? null);
  const [status, setStatus] = useState<"idle" | "uploading" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);

    const extension = LOGO_EXTENSIONS[file.type];
    if (!extension) {
      setError("Please upload a PNG, JPG, WebP or SVG file.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError("Logos must be 5 MB or smaller.");
      return;
    }

    setStatus("uploading");
    const path = `brand-assets/${userId}/logo-${Date.now()}.${extension}`;
    try {
      await upload(path, file, {
        access: "private",
        handleUploadUrl: "/api/uploads",
        clientPayload: JSON.stringify({ kind: "logo" }),
        contentType: file.type,
      });
    } catch {
      setStatus("idle");
      setError("Upload failed. Please try again.");
      return;
    }

    const result = await saveLogo(path);
    if (result.error) {
      setStatus("idle");
      setError(result.error);
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setStatus("saved");
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-white">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local/signed URL
          <img src={previewUrl} alt="Your logo" className="h-full w-full object-contain p-1" />
        ) : (
          <span className="text-xs text-black/30">No logo</span>
        )}
      </div>
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept={Object.keys(LOGO_EXTENSIONS).join(",")}
          className="hidden"
          data-testid="logo-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={status === "uploading"}
          onClick={() => inputRef.current?.click()}
        >
          {status === "uploading"
            ? "Uploading…"
            : previewUrl
              ? "Replace logo"
              : "Upload logo"}
        </Button>
        <p className="text-xs text-black/50">PNG, JPG, WebP or SVG, up to 5 MB.</p>
        {status === "saved" && <p className="text-xs text-green-700">Logo saved.</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
