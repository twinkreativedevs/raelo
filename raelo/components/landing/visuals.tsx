import { Check, Heart, MessageCircle, Send, X } from "lucide-react";

import { cn } from "@/lib/utils";

// Illustrations for the landing page, drawn in code so they stay sharp,
// load instantly and use the brand palette (red #ed1c24, dark #080d16).
// They show the kind of content Raelo makes, not stock photos. To use real
// client work instead, swap a component for next/image pointing at a file
// in /public.

const RED = "#ed1c24";
const DARK = "#080d16";
const BLUSH = "#fde8e9";
const CREAM = "#fff5ea";

type Tile = { bg: string; fg: string; kicker: string; title: string };

const TILES: Tile[] = [
  { bg: RED, fg: "#fff", kicker: "NEW IN", title: "Weekend menu" },
  { bg: DARK, fg: "#fff", kicker: "TIP 03", title: "Post at 7pm" },
  { bg: BLUSH, fg: DARK, kicker: "OFFER", title: "20% off Friday" },
  { bg: CREAM, fg: DARK, kicker: "BEHIND THE SCENES", title: "How we pack" },
  { bg: DARK, fg: RED, kicker: "LAUNCH", title: "Now open" },
  { bg: RED, fg: "#fff", kicker: "HOW TO", title: "3 easy steps" },
];

function PostTile({ tile, className }: { tile: Tile; className?: string }) {
  return (
    <div
      className={cn("relative aspect-square overflow-hidden rounded-md p-1.5", className)}
      style={{ background: tile.bg, color: tile.fg }}
    >
      <p className="truncate text-[6px] font-bold tracking-[0.12em] opacity-70">{tile.kicker}</p>
      <p className="mt-0.5 text-[9px] font-black leading-tight">{tile.title}</p>
      <span className="absolute -bottom-3 -right-3 h-8 w-8 rounded-full opacity-25" style={{ background: tile.fg }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: a content workspace with a plan, a post and its caption       */
/* ------------------------------------------------------------------ */

const PLAN = [
  { day: "Mon 6", type: "Educate", title: "3 mistakes new customers make", tone: "bg-[#080d16] text-white" },
  { day: "Wed 8", type: "Promote", title: "Weekend menu is here", tone: "bg-[#ed1c24] text-white", active: true },
  { day: "Fri 10", type: "Engage", title: "This or that? Jollof edition", tone: "bg-[#fde8e9] text-[#080d16]" },
  { day: "Sun 12", type: "Build trust", title: "Behind the scenes: Saturday prep", tone: "bg-[#fff5ea] text-[#080d16]" },
];

export function HeroWorkspace() {
  return (
    <div className="relative mx-auto w-full max-w-[600px] py-6 lg:py-10">
      <div aria-hidden className="absolute -right-10 top-0 h-72 w-72 rounded-full bg-[#ed1c24] sm:h-96 sm:w-96" />
      <div aria-hidden className="absolute -left-8 bottom-0 h-40 w-40 rounded-full border-[18px] border-[#080d16]/[0.06]" />

      <div
        role="img"
        aria-label="A Raelo content workspace: a week's content plan, a designed post and its caption"
        className="relative overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(8,13,22,0.35)] ring-1 ring-black/5"
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-3.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ed1c24]" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
          </div>
          <p className="text-[11px] font-semibold text-black/45">Content plan · October</p>
          <span className="rounded-full bg-[#080d16] px-2.5 py-1 text-[10px] font-bold text-white">12 posts</span>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1.05fr] sm:p-5">
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-[0.16em] text-black/40">THIS WEEK</p>
            {PLAN.map((item) => (
              <div
                key={item.day}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-2.5",
                  item.active ? "border-[#ed1c24] bg-[#ed1c24]/[0.04]" : "border-black/[0.06]",
                )}
              >
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-black", item.tone)}>
                  {item.day.split(" ")[1]}
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#ed1c24]">{item.type}</p>
                  <p className="truncate text-[12px] font-semibold text-[#080d16]">{item.title}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#ed1c24] p-5 text-white">
              <p className="text-[10px] font-bold tracking-[0.18em] text-white/75">NEW THIS WEEKEND</p>
              <p className="mt-2 text-[28px] font-black leading-[0.95] tracking-tight">Weekend menu is here.</p>
              <p className="mt-3 text-[11px] font-semibold text-white/80">Saturday from 10am</p>
              <span className="absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-[#080d16]" />
              <span className="absolute bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[11px] font-black text-[#ed1c24]">
                NEW
              </span>
            </div>
            <div className="mt-3 rounded-xl bg-[#f6f6f7] p-3">
              <p className="text-[9px] font-bold tracking-[0.14em] text-black/40">CAPTION · INSTAGRAM</p>
              <p className="mt-1 text-[11px] leading-[1.5] text-black/70">
                Our weekend menu is here. Swing by Saturday from 10am, or order ahead with the link in bio.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-1 left-4 hidden rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-black/5 sm:block lg:-left-6">
        <p className="text-[10px] font-bold tracking-[0.14em] text-black/40">BRAND KIT</p>
        <div className="mt-2 flex gap-1.5">
          {[RED, DARK, BLUSH, CREAM].map((c) => (
            <span key={c} className="h-6 w-6 rounded-full ring-1 ring-black/10" style={{ background: c }} />
          ))}
        </div>
      </div>

      <div className="absolute -bottom-1 right-4 flex items-center gap-2.5 rounded-2xl bg-[#080d16] px-4 py-3 text-white shadow-xl sm:right-10">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ed1c24]">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
        <div>
          <p className="text-[12px] font-black">Approved</p>
          <p className="text-[10px] text-white/60">Ready to post Wednesday</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Meet Raelo: a month of content, handled                            */
/* ------------------------------------------------------------------ */

const HANDLED = [
  "Content plan for the month",
  "12 posts designed for your brand",
  "Captions written",
  "Calendar organised",
  "Delivered to your portal",
];

export function HandledVisual() {
  return (
    <div
      role="img"
      aria-label="A month of content handled: plan, designed posts, captions, calendar and delivery all ticked off"
      className="rounded-3xl bg-white p-5 text-[#080d16] sm:p-7"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-[#ed1c24]">OCTOBER</p>
          <p className="text-xl font-black">Your content, handled</p>
        </div>
        <span className="rounded-full bg-[#ed1c24] px-3 py-1.5 text-[11px] font-bold text-white">Ready</span>
      </div>
      <ul className="mt-5 space-y-2">
        {HANDLED.map((item) => (
          <li key={item} className="flex items-center gap-3 rounded-xl bg-[#f6f6f7] px-3.5 py-2.5 text-sm font-semibold">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#080d16] text-white">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-5 grid grid-cols-6 gap-1.5">
        {[...TILES].map((tile, i) => (
          <PostTile key={i} tile={tile} className="rounded-md p-0 [&>p]:hidden" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Before vs after                                                     */
/* ------------------------------------------------------------------ */

export function BeforeAfter() {
  const days = Array.from({ length: 21 }, (_, i) => i + 1);
  const scattered = new Set([3, 4, 15]);
  // Light tiles only, so every planned post shows on the dark card.
  const planned = new Map([[2, 0], [5, 2], [7, 3], [9, 5], [12, 0], [14, 2], [16, 3], [19, 5]]);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-dashed border-black/15 bg-white p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-black/45">
          <X className="h-4 w-4" /> WITHOUT RAELO
        </p>
        <p className="mt-5 text-3xl font-black leading-tight tracking-tight text-black/80">“What should we post?”</p>
        <ul className="mt-6 grid gap-x-4 gap-y-3 sm:grid-cols-2 text-[15px] text-black/55">
          {["No ideas", "No time", "Random posting", "Inconsistent presence"].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/[0.06]">
                <X className="h-3 w-3" />
              </span>
              {t}
            </li>
          ))}
        </ul>
        <div role="img" aria-label="A mostly empty content calendar" className="mt-8 grid grid-cols-7 gap-1.5">
          {days.map((d) => (
            <span key={d} className={cn("aspect-square rounded-md", scattered.has(d) ? "bg-black/20" : "bg-black/[0.05]")} />
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-[#080d16] p-6 text-white sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-[#ed1c24]">
          <Check className="h-4 w-4" strokeWidth={3} /> WITH RAELO
        </p>
        <p className="mt-5 text-3xl font-black leading-tight tracking-tight">“It&apos;s already done.”</p>
        <ul className="mt-6 grid gap-x-4 gap-y-3 sm:grid-cols-2 text-[15px] text-white/80">
          {["Content planned", "Content created", "Calendar organised", "Ready to publish", "Consistent presence"].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ed1c24]">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {t}
            </li>
          ))}
        </ul>
        <div role="img" aria-label="A content calendar with posts planned through the month" className="mt-8 grid grid-cols-7 gap-1.5">
          {days.map((d) =>
            planned.has(d) ? (
              <PostTile key={d} tile={TILES[planned.get(d)!]} className="rounded-md p-0 [&>p]:hidden" />
            ) : (
              <span key={d} className="aspect-square rounded-md bg-white/[0.07]" />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Showcase: examples of each kind of content                          */
/* ------------------------------------------------------------------ */

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-xs font-semibold text-white/60">{children}</p>;
}

export function InstagramPostSample() {
  return (
    <figure className="h-full">
      <div className="overflow-hidden rounded-2xl bg-white text-[#080d16]">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ed1c24] text-[11px] font-black text-white">A</span>
          <p className="text-xs font-bold">adaskitchen</p>
          <span className="ml-auto text-black/30">•••</span>
        </div>
        <div className="relative aspect-square overflow-hidden bg-[#080d16] p-6 text-white sm:p-8">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#ed1c24]">NEW COLLECTION</p>
          <p className="mt-3 text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
            Fresh flavours.
            <br />
            Every Friday.
          </p>
          <span className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-[#ed1c24]" />
          <span className="absolute bottom-8 right-8 h-20 w-20 rounded-full border-[10px] border-white" />
          <p className="absolute bottom-6 left-6 text-xs font-semibold text-white/70 sm:left-8">Order from 9am</p>
        </div>
        <div className="flex items-center gap-4 px-3 py-2.5 text-black/70">
          <Heart className="h-4 w-4" />
          <MessageCircle className="h-4 w-4" />
          <Send className="h-4 w-4" />
        </div>
      </div>
      <Label>Instagram post</Label>
    </figure>
  );
}

export function CarouselSample() {
  const slides = [
    { bg: RED, fg: "#fff", n: "1/5", title: "5 ways to keep customers coming back" },
    { bg: "#fff", fg: DARK, n: "2/5", title: "Reply to every message" },
    { bg: BLUSH, fg: DARK, n: "3/5", title: "Reward regulars" },
  ];
  return (
    <figure>
      <div className="flex gap-2 overflow-hidden">
        {slides.map((s, i) => (
          <div
            key={s.n}
            className={cn("relative aspect-square shrink-0 rounded-xl p-4", i === 0 ? "w-[44%]" : "w-[36%]")}
            style={{ background: s.bg, color: s.fg }}
          >
            <p className="text-[10px] font-bold opacity-60">{s.n}</p>
            <p className={cn("mt-2 font-black leading-tight", i === 0 ? "text-lg sm:text-xl" : "text-sm")}>{s.title}</p>
            {i === 0 && <p className="absolute bottom-3 right-3 text-[10px] font-bold opacity-80">Swipe →</p>}
          </div>
        ))}
      </div>
      <Label>Carousel</Label>
    </figure>
  );
}

export function PromoSample() {
  return (
    <figure>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#ed1c24] p-5 text-white">
        <p className="text-[10px] font-bold tracking-[0.18em] text-white/80">THIS WEEKEND ONLY</p>
        <p className="mt-2 text-5xl font-black leading-none tracking-tighter sm:text-6xl">20%</p>
        <p className="text-2xl font-black leading-none">OFF</p>
        <span className="absolute bottom-4 left-5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#ed1c24]">Shop now</span>
        <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full border-[14px] border-white/25" />
      </div>
      <Label>Promotional graphic</Label>
    </figure>
  );
}

export function EducationalSample() {
  return (
    <figure>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white p-5 text-[#080d16]">
        <p className="text-[10px] font-bold tracking-[0.18em] text-[#ed1c24]">DID YOU KNOW?</p>
        <p className="mt-2 text-base font-black leading-tight sm:text-xl">Posts with a clear next step get more replies.</p>
        <div className="absolute bottom-5 left-5 right-5 hidden space-y-1.5 sm:block">
          {[90, 70, 45].map((w) => (
            <span key={w} className="block h-2 rounded-full bg-[#080d16]/10">
              <span className="block h-2 rounded-full bg-[#080d16]" style={{ width: `${w}%` }} />
            </span>
          ))}
        </div>
      </div>
      <Label>Educational post</Label>
    </figure>
  );
}

export function ProductSample() {
  return (
    <figure>
      <div className="relative aspect-[2/1] overflow-hidden rounded-2xl bg-[#fff5ea] p-5 text-[#080d16] sm:aspect-square">
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/50">BESTSELLER</p>
        <p className="mt-1 text-xl font-black leading-tight">Shea body butter</p>
        <div className="absolute bottom-6 left-1/2 h-24 w-20 -translate-x-1/2 rounded-t-[2rem] rounded-b-xl bg-[#080d16]">
          <span className="absolute inset-x-3 top-8 h-6 rounded bg-[#ed1c24]" />
        </div>
        <span className="absolute bottom-5 right-4 rounded-full bg-[#ed1c24] px-2.5 py-1 text-[11px] font-black text-white">₦8,500</span>
      </div>
      <Label>Product content</Label>
    </figure>
  );
}

export function CampaignSample() {
  return (
    <figure>
      <div className="grid grid-cols-3 gap-2">
        {["3", "2", "1"].map((n, i) => (
          <div
            key={n}
            className={cn(
              "flex aspect-[4/5] flex-col justify-between rounded-xl p-3",
              i === 2 ? "bg-[#ed1c24] text-white" : "bg-white text-[#080d16]",
            )}
          >
            <p className="text-[9px] font-bold tracking-[0.14em] opacity-60">GRAND OPENING</p>
            <p className="text-4xl font-black leading-none">{n}</p>
            <p className="text-[10px] font-semibold opacity-70">{n === "1" ? "day to go" : "days to go"}</p>
          </div>
        ))}
      </div>
      <Label>Campaign content</Label>
    </figure>
  );
}

export function CaptionSample() {
  return (
    <figure>
      <div className="flex h-full flex-col rounded-2xl bg-white p-5 text-[#080d16]">
        <p className="text-[10px] font-bold tracking-[0.16em] text-black/40">CAPTION · INSTAGRAM</p>
        <p className="mt-3 text-[13px] leading-[1.6] text-black/75">
          Fresh flavours, every Friday. This week: smoky jollof, peppered chicken and our new zobo.
          Order from 9am, or swing by from 12. Link in bio.
        </p>
        <p className="mt-3 text-[12px] font-semibold text-[#ed1c24]">#FridayFlavours #LagosEats</p>
      </div>
      <Label>Caption</Label>
    </figure>
  );
}

export function CalendarSample() {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const postDays = new Map([[2, 0], [4, 2], [7, 1], [9, 3], [11, 5], [14, 0], [16, 2], [18, 4], [21, 1], [23, 3], [25, 5], [28, 0]]);
  return (
    <figure>
      <div className="rounded-2xl bg-white p-4 text-[#080d16]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-black">October</p>
          <p className="text-[11px] text-black/45">12 posts planned</p>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <p key={i} className="text-center text-[9px] font-bold text-black/35">{d}</p>
          ))}
          {days.map((day) =>
            postDays.has(day) ? (
              <PostTile key={day} tile={TILES[postDays.get(day)!]} className="rounded p-0.5 [&>p:first-child]:hidden [&>p]:text-[6px]" />
            ) : (
              <span key={day} className="aspect-square rounded bg-black/[0.04] p-0.5 text-[8px] text-black/30">{day}</span>
            ),
          )}
        </div>
      </div>
      <Label>Content calendar</Label>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Results: the same message as a plain post and as a designed one     */
/* ------------------------------------------------------------------ */

const PAIRS = [
  {
    label: "Announcement",
    before: "We are open this Saturday. Come and buy.",
    after: { kicker: "THIS SATURDAY", title: "Doors open at 10am.", note: "See you there", bg: RED, fg: "#fff" },
  },
  {
    label: "Educational",
    before: "Tips for caring for your skin in harmattan.",
    after: { kicker: "HARMATTAN SKIN GUIDE", title: "3 steps to soft skin all season.", note: "Save this post", bg: DARK, fg: "#fff" },
  },
  {
    label: "Promotion",
    before: "Discount on all items this week.",
    after: { kicker: "THIS WEEK ONLY", title: "15% off everything.", note: "Use code RAELO15", bg: BLUSH, fg: DARK },
  },
];

export function ResultPairs() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {PAIRS.map((pair) => (
        <figure key={pair.label} className="rounded-3xl bg-[#f6f6f7] p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-[10px] font-bold tracking-[0.16em] text-black/40">BEFORE</p>
              <div className="flex aspect-[4/5] items-center rounded-xl bg-white p-3 ring-1 ring-black/[0.06]">
                <p className="text-[12px] leading-snug text-black/55">{pair.before}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold tracking-[0.16em] text-[#ed1c24]">WITH RAELO</p>
              <div
                className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-xl p-3"
                style={{ background: pair.after.bg, color: pair.after.fg }}
              >
                <p className="text-[8px] font-bold tracking-[0.14em] opacity-70">{pair.after.kicker}</p>
                <p className="mt-1.5 text-[17px] font-black leading-[1.05] tracking-tight">{pair.after.title}</p>
                <p className="mt-auto text-[10px] font-bold opacity-80">{pair.after.note}</p>
                <span className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full opacity-25" style={{ background: pair.after.fg }} />
              </div>
            </div>
          </div>
          <figcaption className="mt-3 text-sm font-bold text-[#080d16]">{pair.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}
