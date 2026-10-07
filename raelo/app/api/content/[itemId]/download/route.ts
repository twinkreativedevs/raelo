import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { currentUser } from "@/lib/auth";
import { schema } from "@/lib/db";
import { isUuid } from "@/lib/format";
import { signedReadUrl } from "@/lib/storage";

// Downloads one content item. The row is read as the user (RLS), so a
// client only gets here for items in a published batch of their own.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  const auth = await currentUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content_items } = schema;
  const [item] = isUuid(itemId)
    ? await auth.asUser((tx) =>
        tx
          .select({ id: content_items.id, storage_path: content_items.storage_path, asset_url: content_items.asset_url })
          .from(content_items)
          .where(eq(content_items.id, itemId)),
      )
    : [];

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (item.storage_path) {
    // Short-lived link straight to the private store, so large videos never
    // pass through this function.
    const url = await signedReadUrl(item.storage_path, 60);
    if (!url) {
      return NextResponse.json({ error: "File unavailable" }, { status: 502 });
    }
    return NextResponse.redirect(url);
  }

  // Legacy items may only have an external link.
  if (item.asset_url && /^https?:\/\//i.test(item.asset_url)) {
    return NextResponse.redirect(item.asset_url);
  }

  return NextResponse.json({ error: "No file attached" }, { status: 404 });
}
