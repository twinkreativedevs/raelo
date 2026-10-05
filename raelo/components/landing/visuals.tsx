import { BarChart3, Briefcase, Download, Layers, Megaphone, Store } from "lucide-react";

// Illustrations for the landing page, drawn in code so they stay sharp,
// load instantly and use the brand palette (red #ed1c24, dark #080d16).
// They show the product itself (designed posts, the delivery portal), not
// stock photos. To use photography instead, swap a component for
// next/image pointing at a file in /public.

type Tile = { bg: string; fg: string; kicker: string; title: string; shape: "circle" | "bars" | "tag" | "quote" };

const TILES: Tile[] = [
  { bg: "#ed1c24", fg: "#ffffff", kicker: "NEW IN", title: "Weekend menu", shape: "circle" },
  { bg: "#080d16", fg: "#ffffff", kicker: "TIP 03", title: "Post at 7pm", shape: "bars" },
  { bg: "#fde8e9", fg: "#080d16", kicker: "OFFER", title: "20% off Friday", shape: "tag" },
  { bg: "#f4f4f5", fg: "#080d16", kicker: "REVIEW", title: "“Fast and lovely”", shape: "quote" },
  { bg: "#080d16", fg: "#ed1c24", kicker: "LAUNCH", title: "Now open", shape: "circle" },
  { bg: "#ed1c24", fg: "#ffffff", kicker: "HOW TO", title: "3 easy steps", shape: "bars" },
];

function TileShape({ shape, fg }: { shape: Tile["shape"]; fg: string }) {
  if (shape === "circle") {
    return <div className="absolute -bottom-4 -right-4 h-14 w-14 rounded-full opacity-25" style={{ background: fg }} />;
  }
  if (shape === "bars") {
    return (
      <div className="absolute bottom-2 right-2 flex items-end gap-0.5 opacity-40">
        {[6, 10, 14].map((h) => (
          <span key={h} className="w-1.5 rounded-sm" style={{ height: h, background: fg }} />
        ))}
      </div>
    );
  }
  if (shape === "tag") {
    return <div className="absolute bottom-2 right-2 h-5 w-9 rotate-[-8deg] rounded-md opacity-80" style={{ background: "#ed1c24" }} />;
  }
  return <div className="absolute right-2 top-1 text-3xl font-black leading-none opacity-20" style={{ color: fg }}>”</div>;
}

function PostTile({ tile, className = "" }: { tile: Tile; className?: string }) {
  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-lg p-2 ${className}`}
      style={{ background: tile.bg, color: tile.fg }}
    >
      <p className="text-[7px] font-bold tracking-[0.15em] opacity-70">{tile.kicker}</p>
      <p className="mt-1 text-[11px] font-black leading-tight">{tile.title}</p>
      <TileShape shape={tile.shape} fg={tile.fg} />
    </div>
  );
}

/** Hero: a phone showing a feed of finished posts. */
export function HeroVisual() {
  return (
    <div className="relative flex min-h-[520px] items-center justify-center sm:min-h-[560px]">
      <div className="absolute h-[340px] w-[340px] rounded-[45%] bg-[#ed1c24] sm:h-[430px] sm:w-[430px] lg:h-[500px] lg:w-[500px]" />

      <div
        role="img"
        aria-label="A phone showing a month of designed social media posts"
        className="relative z-10 w-[250px] rounded-[2.2rem] border-[10px] border-[#080d16] bg-white shadow-2xl sm:w-[280px]"
      >
        <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-black/10" />
        <div className="flex items-center gap-2 px-3 pb-2 pt-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ed1c24] text-xs font-black text-white">B</span>
          <div>
            <p className="text-[11px] font-bold leading-none">yourbrand</p>
            <p className="text-[9px] text-black/40">Posting every week</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 px-1 pb-3">
          {[...TILES, ...TILES.slice(0, 3)].map((tile, i) => (
            <PostTile key={i} tile={tile} className="rounded-sm" />
          ))}
        </div>
      </div>

      <div className="absolute right-0 top-20 z-20 rounded-xl bg-white px-4 py-3 shadow-xl sm:right-4 sm:top-24">
        <p className="text-sm font-black">October batch</p>
        <p className="text-xs text-black/50">Ready to download ✓</p>
      </div>
      <div className="absolute bottom-16 left-0 z-20 rounded-xl bg-[#080d16] px-4 py-3 text-white shadow-xl sm:bottom-20 sm:left-4">
        <p className="text-sm font-black">Designs + captions</p>
        <p className="text-xs text-white/60">Made for your brand</p>
      </div>
    </div>
  );
}

const AUDIENCE_ART = {
  "Business Owners": { icon: Store, accent: Megaphone },
  "Digital Marketers": { icon: BarChart3, accent: Megaphone },
  Agencies: { icon: Briefcase, accent: Layers },
} as const;

/** Header art for the "Built for" cards. */
export function AudienceArt({ audience }: { audience: string }) {
  const art = AUDIENCE_ART[audience as keyof typeof AUDIENCE_ART] ?? AUDIENCE_ART["Business Owners"];
  const Icon = art.icon;
  const Accent = art.accent;
  return (
    <div className="relative flex h-40 items-center justify-center overflow-hidden bg-white/10" aria-hidden>
      <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-[#ed1c24]/30" />
      <div className="absolute -bottom-8 -right-4 h-28 w-28 rounded-[40%] bg-white/5" />
      <div className="grid grid-cols-3 gap-1.5 opacity-90">
        {TILES.slice(0, 3).map((tile, i) => (
          <PostTile key={i} tile={tile} className="w-12" />
        ))}
      </div>
      <span className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ed1c24] text-white shadow-lg">
        <Icon className="h-5 w-5" />
      </span>
      <span className="absolute bottom-5 right-5 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#080d16]">
        <Accent className="h-4 w-4" />
      </span>
    </div>
  );
}

/** "How it works": the client portal with a delivered batch. */
export function PortalVisual() {
  return (
    <div
      role="img"
      aria-label="The Raelo client portal showing a month of content ready to download"
      className="rounded-3xl bg-[#f4f4f5] p-4 sm:p-6"
    >
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center gap-1.5 border-b border-black/5 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ed1c24]" />
          <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
          <span className="ml-3 truncate text-[11px] text-black/40">raelo · Your content</span>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] text-[#ed1c24]">DELIVERED THIS MONTH</p>
              <p className="text-lg font-black">October posts</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ed1c24] px-3 py-1.5 text-[11px] font-bold text-white">
              <Download className="h-3 w-3" /> Download all
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {TILES.map((tile, i) => (
              <PostTile key={i} tile={tile} />
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-[#fafafa] p-3">
            <p className="text-[10px] font-bold text-black/40">CAPTION · INSTAGRAM</p>
            <p className="mt-1 text-xs leading-5 text-black/70">
              Our weekend menu is here 🍲 Swing by Saturday from 10am, or order ahead with the link in bio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** "The solution": a month of posts laid out on a content calendar. */
export function CalendarVisual() {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const postDays = new Map([[2, 0], [5, 1], [8, 2], [11, 3], [15, 4], [18, 5], [22, 0], [25, 2]]);
  return (
    <div
      role="img"
      aria-label="A month of posts scheduled on a content calendar"
      className="flex min-h-[360px] items-center justify-center bg-black/20 p-6 sm:p-10"
    >
      <div className="w-full max-w-md rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="mb-3 flex items-center justify-between text-white">
          <p className="text-sm font-black">October</p>
          <p className="text-[11px] text-white/50">8 posts scheduled</p>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <p key={i} className="text-center text-[9px] font-bold text-white/40">{d}</p>
          ))}
          {days.map((day) => {
            const tile = postDays.has(day) ? TILES[postDays.get(day)!] : null;
            return tile ? (
              <PostTile key={day} tile={tile} className="!p-1 [&_p]:!text-[5px] sm:[&_p]:!text-[7px]" />
            ) : (
              <div key={day} className="aspect-square rounded-lg bg-white/5 p-1 text-[8px] text-white/30">{day}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
