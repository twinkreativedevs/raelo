import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { authorize } from "@/lib/auth";
import { TEAM_ROLES } from "@/lib/roles";
import { CONTENT_MAX_BYTES, CONTENT_MIME_TYPES } from "@/lib/content-upload";
import { schema } from "@/lib/db";
import { LOGO_EXTENSIONS, LOGO_MAX_BYTES } from "@/lib/logo-upload";
import { BRAND_ASSETS_PREFIX, CONTENT_PREFIX, storageConfigured } from "@/lib/storage";

// Issues one-off upload tokens for browser uploads to the private Blob
// store (`upload()` from @vercel/blob/client calls this). The token is
// bound to the exact pathname, content types and size checked here:
// - kind "content": staff who can see the batch (RLS: admins, or the team
//   assigned to that subscription) may upload into
//   content/{subscription_id}/{batch_id}/
// - kind "logo": any signed-in user may upload into brand-assets/{their id}/
// After uploading, the browser calls a server action that re-checks the
// path and records it (registerUploadedItem / saveLogo).

type Payload = { kind: "content"; batchId: string } | { kind: "logo" };

function parsePayload(raw: string | null): Payload | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (value?.kind === "logo") return { kind: "logo" };
    if (value?.kind === "content" && typeof value.batchId === "string") return { kind: "content", batchId: value.batchId };
  } catch {}
  return null;
}

export async function POST(request: NextRequest) {
  if (!storageConfigured()) {
    return NextResponse.json({ error: "File uploads aren't set up yet (BLOB_READ_WRITE_TOKEN)." }, { status: 503 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parsePayload(clientPayload);
        if (!payload || pathname.includes("..")) throw new Error("Invalid upload.");

        if (payload.kind === "logo") {
          const auth = await authorize(["client", ...TEAM_ROLES]);
          if (!auth || !pathname.startsWith(`${BRAND_ASSETS_PREFIX}${auth.profile.id}/`)) {
            throw new Error("Not allowed.");
          }
          return {
            allowedContentTypes: Object.keys(LOGO_EXTENSIONS),
            maximumSizeInBytes: LOGO_MAX_BYTES,
            addRandomSuffix: false,
            allowOverwrite: true,
          };
        }

        const auth = await authorize(TEAM_ROLES);
        if (!auth) throw new Error("Not allowed.");
        const [batch] = await auth.asUser((tx) =>
          tx
            .select({ id: schema.content_batches.id, subscription_id: schema.content_batches.subscription_id })
            .from(schema.content_batches)
            .where(eq(schema.content_batches.id, payload.batchId)),
        );
        if (!batch || !pathname.startsWith(`${CONTENT_PREFIX}${batch.subscription_id}/${batch.id}/`)) {
          throw new Error("Not allowed.");
        }
        return {
          allowedContentTypes: CONTENT_MIME_TYPES,
          maximumSizeInBytes: CONTENT_MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload refused." },
      { status: 400 },
    );
  }
}
