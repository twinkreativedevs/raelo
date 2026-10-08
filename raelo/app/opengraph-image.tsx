import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// The preview shown when a Raelo link is shared (Slack, WhatsApp,
// LinkedIn, X…). Rendered once at build time.

export const alt = "Raelo: your social media, handled every month";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RED = "#ed1c24";
const DARK = "#080d16";

const TILES = [
  { bg: RED, fg: "#fff", kicker: "NEW IN", title: "Weekend menu" },
  { bg: "#ffffff", fg: DARK, kicker: "OFFER", title: "20% off Friday" },
  { bg: "#1a2130", fg: "#fff", kicker: "TIP 03", title: "Post at 7pm" },
  { bg: "#fde8e9", fg: DARK, kicker: "LAUNCH", title: "Now open" },
];

export default async function Image() {
  const [black, medium] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Geist-Black.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Geist-Medium.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: DARK,
          color: "#fff",
          fontFamily: "Geist",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", right: -140, top: -170, width: 560, height: 560, borderRadius: 999, background: RED, display: "flex" }} />
        <div style={{ position: "absolute", left: -120, bottom: -220, width: 440, height: 440, borderRadius: 999, border: "56px solid rgba(255,255,255,0.05)", display: "flex" }} />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 60px 72px", width: 700 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: RED, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 900 }}>
              R
            </div>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1 }}>Raelo</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 70, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2.5 }}>
              Your social media, handled every month.
            </div>
            <div style={{ marginTop: 26, fontSize: 28, fontWeight: 500, lineHeight: 1.35, color: "rgba(255,255,255,0.68)", maxWidth: 600 }}>
              Designed posts and captions for your brand, delivered to your private portal.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, fontWeight: 500, color: "rgba(255,255,255,0.75)" }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: RED, display: "flex" }} />
            www.helloraelo.com
          </div>
        </div>

        {/* A phone showing a month of posts */}
        <div style={{ position: "absolute", right: 96, top: 92, width: 330, height: 520, borderRadius: 44, background: "#ffffff", border: "12px solid #11161f", display: "flex", flexDirection: "column", padding: 18, boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 999, background: RED, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff" }}>B</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: DARK }}>yourbrand</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(8,13,22,0.45)" }}>Posting every week</div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[...TILES, ...TILES.slice().reverse()].map((tile, i) => (
              <div
                key={i}
                style={{
                  width: 125,
                  height: 125,
                  borderRadius: 14,
                  background: tile.bg,
                  border: tile.bg === "#ffffff" ? "2px solid #eceef1" : "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: 14,
                  color: tile.fg,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.7, letterSpacing: 1 }}>{tile.kicker}</div>
                <div style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.1 }}>{tile.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: black, weight: 900, style: "normal" },
        { name: "Geist", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
