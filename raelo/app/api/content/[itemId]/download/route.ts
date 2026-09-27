import { NextResponse, type NextRequest } from "next/server";

import { CONTENT_BUCKET, downloadName } from "@/lib/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Downloads one content item. The row is read with the user's client, so a
// client only gets here for items in a published batch of their own.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: item } = await supabase
    .from("content_items")
    .select("id, title, file_name, storage_path, asset_url")
    .eq("id", itemId)
    .maybeSingle();

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (item.storage_path) {
    const { data, error } = await createAdminClient()
      .storage.from(CONTENT_BUCKET)
      .createSignedUrl(item.storage_path, 60, {
        download: downloadName(item),
      });

    if (error || !data) {
      return NextResponse.json({ error: "File unavailable" }, { status: 502 });
    }
    return NextResponse.redirect(data.signedUrl);
  }

  // Legacy items may only have an external link.
  if (item.asset_url && /^https?:\/\//i.test(item.asset_url)) {
    return NextResponse.redirect(item.asset_url);
  }

  return NextResponse.json({ error: "No file attached" }, { status: 404 });
}
