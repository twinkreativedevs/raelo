import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// Home-screen icon on iPhone/iPad (iOS rounds the corners itself).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
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
          color: "#fff",
          fontSize: 124,
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
