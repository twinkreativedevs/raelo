import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// Browser-tab icon: the red "R" mark.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  const black = await readFile(join(process.cwd(), "assets/fonts/Geist-Black.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ed1c24",
          borderRadius: 14,
          color: "#fff",
          fontSize: 46,
          fontFamily: "Geist",
          fontWeight: 900,
        }}
      >
        R
      </div>
    ),
    { ...size, fonts: [{ name: "Geist", data: black, weight: 900, style: "normal" }] },
  );
}
