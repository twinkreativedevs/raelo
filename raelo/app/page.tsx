import Link from "next/link";
import { ArrowRight, Check, Plus, Sparkles } from "lucide-react";

import { formatPrice, getActivePackages, type PublicPackage } from "@/lib/packages";
import { getPublicAssistant } from "@/lib/assistant";
import { getSettingValue } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { AssistantWidget } from "@/components/assistant-widget";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import {
  AudienceArt,
  CalendarSample,
  CampaignSample,
  CaptionSample,
  CarouselSample,
  DownloadSample,
  EducationalSample,
  HandledVisual,
  HeroWorkspace,
  InstagramPostSample,
  ProductSample,
  PromoSample,
  ResultPairs,
} from "@/components/landing/visuals";

// Packages come from the database; re-fetch at most every 5 minutes.
export const revalidate = 300;

const WORRIES = [
  "What should I post?",
  "When should I post?",
  "I need to design something.",
  "I don't have any ideas.",
  "I've been too busy to post.",
];

const HANDLED_THOUGHTS = [
  "My content is planned.",
  "My designs are ready.",
  "My captions are ready.",
  "My social media has direction.",
  "I don't have to worry about it every day.",
];

const PROBLEMS = [
  { title: "Inconsistent Posting", text: "You disappear when business gets busy." },
  { title: "Creative Blocks", text: "You don't always know what to post next." },
  { title: "Keeping Up", text: "Trends, formats, and platforms keep changing." },
  { title: "Too Much Time", text: "Content creation takes time away from running your business." },
];

const BENEFITS = [
  { title: "Plan", text: "Know what you're posting instead of starting from a blank screen.", tone: "bg-white/[0.06] ring-1 ring-white/10" },
  { title: "Create", text: "Get professional designs and engaging captions built around your brand.", tone: "bg-white text-[#080d16]" },
  { title: "Stay Consistent", text: "Keep showing up online without constantly thinking about your next post.", tone: "bg-[#fde8e9] text-[#080d16]" },
  { title: "Focus", text: "Spend your time running and growing your business.", tone: "bg-[#ed1c24]" },
];

const TODO = [
  { title: "Content Ideas", text: "Fresh ideas based on your business and audience." },
  { title: "Content Planning", text: "A clear direction for what your brand should post." },
  { title: "Professional Designs", text: "Visual content created to match your brand." },
  { title: "Captions", text: "Captions written to communicate clearly and engage your audience." },
  { title: "Ready-to-Use Content", text: "Your content delivered so you can download and post." },
];

const WORKFLOW = ["Content Ideas", "Planning", "Design", "Captions", "Content Delivery"];

const DELIVERY = ["Content Calendar", "Post Design", "Caption", "Ready to Download"];

const HOW_IT_WORKS = [
  { title: "Pick Your Plan", text: "Choose the package that fits your content needs." },
  { title: "Pay Securely", text: "Complete your payment securely." },
  { title: "Share Your Brand", text: "Tell us about your business, audience, style, and content needs." },
  { title: "Get Your Content", text: "Your content is prepared and delivered for you to download and use." },
];

const AUDIENCES = [
  { kind: "owner", title: "Business Owners", text: "You already have enough to think about. Let Raelo take content creation off your plate." },
  { kind: "marketer", title: "Digital Marketers", text: "Get reliable creative support without having to handle every design and caption yourself." },
  { kind: "agency", title: "Agencies", text: "Extend your content capacity without constantly expanding your internal workload." },
] as const;

const WHY = [
  { title: "Less Stress", text: "Stop worrying about what to post every day." },
  { title: "More Time", text: "Get back the hours spent planning and creating content." },
  { title: "Better Content", text: "Present your business with professional, intentional content." },
  { title: "Consistency", text: "Stay visible without constantly having to think about social media." },
];

const FAQS = [
  {
    q: "How does Raelo's social media service work?",
    a: "Pick a monthly package and pay securely online. Fill in a short brand brief, and we plan and create your posts and captions. Each month's content arrives in your private Raelo portal, ready to download and post.",
  },
  {
    q: "What happens after I pay?",
    a: "You're taken to your portal to fill in your brand brief: your logo, colours, audience, goals and platforms. As soon as it's complete, we start on your first batch.",
  },
  {
    q: "Do I need to provide my own content?",
    a: "No. We create everything from your brand brief. If you have photos of your products, team or space, share a link in your brief and we'll work them in.",
  },
  {
    q: "What if I don't like the content?",
    a: "Tell your account manager what you'd like changed and we'll revise it. Keeping your brand brief up to date helps every batch fit your style.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Turn off auto-renew on your portal's Billing page and you won't be charged again. Your plan stays active until the end of the period you've paid for.",
  },
  {
    q: "Do you manage multiple platforms?",
    a: "Yes. Starter covers one platform, Growth two and Pro three. Business covers up to five brands. Every post is sized and captioned for the platform it's meant for.",
  },
  {
    q: "When will I receive my first content?",
    a: "We start as soon as your brand brief is complete, and we email you the moment your first batch is ready to download in your portal.",
  },
];

const PERIOD: Record<string, string> = {
  monthly: "/ month",
  quarterly: "/ quarter",
  annual: "/ year",
  one_time: "one-time",
};

async function supportEmail() {
  try {
    const brand = await getSettingValue<{ support_email?: string }>("brand");
    if (brand.support_email) return brand.support_email;
  } catch {
    // Database unavailable (e.g. at build time): use the fallback.
  }
  return process.env.EMAIL_FROM || "hello@helloraelo.com";
}

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={cn("text-xs font-bold uppercase tracking-[0.18em]", light ? "text-white/60" : "text-[#ed1c24]")}>
      {children}
    </p>
  );
}

function PrimaryButton({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-[#ed1c24] px-7 py-4 text-sm font-bold text-white transition hover:bg-[#c9141b]",
        className,
      )}
    >
      {children}
    </a>
  );
}

function Flow({ steps, light }: { steps: readonly string[]; light?: boolean }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-bold",
              light ? "bg-white/10 text-white" : "bg-[#080d16] text-white",
              i === steps.length - 1 && "bg-[#ed1c24] text-white",
            )}
          >
            {step}
          </span>
          {i < steps.length - 1 && <ArrowRight aria-hidden className={cn("h-3.5 w-3.5", light ? "text-white/40" : "text-black/30")} />}
        </li>
      ))}
    </ol>
  );
}

export default async function Home() {
  const [packages, assistant, email] = await Promise.all([
    getActivePackages(),
    // The widget shows only when enabled in Admin → Settings and a Groq key is set.
    getPublicAssistant(),
    supportEmail(),
  ]);
  const talkToUs = `mailto:${email}?subject=${encodeURIComponent("Hello Raelo")}`;

  return (
    <main className="min-h-screen overflow-x-clip bg-white text-[#080d16]">
      <SiteHeader />

      {/* 1. HERO */}
      <section id="home">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-10 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#fde8e9] px-3.5 py-1.5 text-xs font-bold text-[#c9141b]">
              <Sparkles className="h-3.5 w-3.5" /> You focus on your business. We handle your social media.
            </p>
            <h1 className="mt-6 text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-[76px]">
              Your Social Media.
              <br />
              <span className="text-[#ed1c24]">Handled.</span>
              <br />
              Every Month.
            </h1>
            <p className="mt-7 max-w-[560px] text-lg leading-8 text-black/60">
              Stop worrying about what to post, when to post, and how to stay consistent. Raelo helps plan and
              create the content your business needs to stay visible online.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href="#packages">
                Get Started <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
              <a
                href="#what-raelo-handles"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/15 px-7 py-4 text-sm font-bold transition hover:border-black/40"
              >
                Explore Services
              </a>
            </div>
          </div>
          <HeroWorkspace />
        </div>
      </section>

      {/* 2. RELIEF */}
      <section className="bg-[#080d16] text-white">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-10 lg:py-28">
          <div>
            <h2 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              You Have a Business to Run.{" "}
              <span className="text-white/45">You Shouldn&apos;t Have to Worry About What to Post.</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">Running a business already takes enough time.</p>
            <p className="mt-3 max-w-xl text-lg leading-8 text-white/70">
              You shouldn&apos;t have to spend your evenings wondering what to post, staring at a blank screen,
              searching for ideas, designing graphics, writing captions, or trying to figure out what will work
              on social media.
            </p>
            <p className="mt-6 text-xl font-black">
              Tell us about your brand. <span className="text-[#ed1c24]">We&apos;ll help handle the content.</span>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2" role="img" aria-label="Before Raelo: worries about what and when to post. With Raelo: content planned, designed and captioned.">
            <div className="rounded-3xl bg-white/[0.04] p-6 ring-1 ring-white/10">
              <p className="text-[11px] font-bold tracking-[0.16em] text-white/40">BEFORE RAELO</p>
              <ul className="mt-5 space-y-2.5">
                {WORRIES.map((w, i) => (
                  <li
                    key={w}
                    className="w-fit rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2 text-sm text-white/55 line-through decoration-white/30"
                    style={{ marginLeft: `${(i % 3) * 10}px` }}
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-white p-6 text-[#080d16] sm:mt-10">
              <p className="text-[11px] font-bold tracking-[0.16em] text-[#ed1c24]">WITH RAELO</p>
              <ul className="mt-5 space-y-3">
                {HANDLED_THOUGHTS.map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm font-semibold">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ed1c24] text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE PROBLEM */}
      <section className="bg-[#f6f6f7]">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Eyebrow>The problem</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                Keeping Up With Social Media Is <span className="text-[#ed1c24]">Exhausting.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-8 text-black/60">
                You work hard to build your business, but staying active online can become another full-time
                responsibility.
              </p>
              <p className="mt-3 max-w-md text-lg leading-8 text-black/60">
                You need fresh ideas, quality content, consistent posting, and time to actually manage it all.
              </p>
            </div>
            <ol className="divide-y divide-black/10 border-y border-black/10">
              {PROBLEMS.map((p, i) => (
                <li key={p.title} className="grid grid-cols-[3.5rem_1fr] items-baseline gap-4 py-6 sm:grid-cols-[4.5rem_1fr]">
                  <span className="text-3xl font-black text-[#ed1c24] sm:text-4xl">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-xl font-black sm:text-2xl">{p.title}</h3>
                    <p className="mt-1 leading-7 text-black/60">{p.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-14 grid gap-4 rounded-3xl bg-white p-7 sm:p-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <h3 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
              Your Content Should Do More Than Fill Your Feed.
            </h3>
            <p className="text-lg leading-8 text-black/60">
              Your social media should communicate what you do, build trust, and give people a reason to pay
              attention to your brand.
            </p>
          </div>
        </div>
      </section>

      {/* 4. THE SOLUTION */}
      <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[2rem] bg-[#080d16] p-6 text-white sm:p-10 lg:p-16">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <Eyebrow>The solution</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                We Handle the Content. <span className="text-[#ed1c24]">You Handle the Business.</span>
              </h2>
              <p className="mt-6 text-lg leading-8 text-white/70">
                Raelo takes the content work off your plate, from planning and ideas to designs, captions, and
                ready-to-use content.
              </p>
              <p className="mt-3 text-lg leading-8 text-white/70">
                You get a consistent social media presence without having to manage every post yourself.
              </p>
            </div>
            <HandledVisual />
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className={cn("rounded-2xl p-6", b.tone)}>
                <p className="text-2xl font-black uppercase tracking-tight">{b.title}</p>
                <p className="mt-3 text-sm leading-6 opacity-75">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. WHAT RAELO HANDLES */}
      <section id="what-raelo-handles" className="scroll-mt-20">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-4 pb-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:pb-28">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>What Raelo handles</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Your Social Media To-Do List, <span className="text-[#ed1c24]">Handled.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-8 text-black/60">
              Hand it over once. Every month, each of these is taken care of for you.
            </p>
            <div className="mt-8">
              <Flow steps={WORKFLOW} />
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-black/[0.08] bg-white shadow-[0_24px_60px_-30px_rgba(8,13,22,0.35)]">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4">
              <p className="font-black">Your social media to-do list</p>
              <span className="rounded-full bg-[#fde8e9] px-3 py-1 text-xs font-bold text-[#c9141b]">5 of 5 handled</span>
            </div>
            <ul className="divide-y divide-black/[0.06]">
              {TODO.map((item) => (
                <li key={item.title} className="flex items-start gap-4 px-6 py-5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#080d16] text-white">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-black/60">{item.text}</p>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-[#f6f6f7] py-1 pl-1 pr-3 text-xs font-bold sm:inline-flex">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ed1c24] text-[10px] font-black text-white">R</span>
                    Raelo
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 6. CONTENT SHOWCASE */}
      <section id="work" className="scroll-mt-20 bg-[#080d16] text-white">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <Eyebrow>Content showcase</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                This Is What “Social Media Handled” Looks Like.
              </h2>
            </div>
            <p className="text-lg leading-8 text-white/65 lg:max-w-md lg:justify-self-end">
              Instead of wondering what to post every week, you have your content ready to go.
            </p>
          </div>

          <div className="mt-12 rounded-[1.75rem] bg-white/[0.04] p-4 ring-1 ring-white/10 sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ed1c24]" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="ml-3 text-xs text-white/45">Your Raelo portal · October</span>
              </div>
              <Flow steps={DELIVERY} light />
            </div>
            <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-4">
              <CalendarSample />
              <InstagramPostSample compact />
              <CaptionSample />
              <DownloadSample />
            </div>
          </div>

          <p className="mt-14 text-sm font-bold uppercase tracking-[0.16em] text-white/50">Every format your brand needs</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <CarouselSample />
            </div>
            <div className="lg:col-span-5">
              <CampaignSample />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:col-span-2 lg:col-span-12 lg:grid-cols-3">
              <PromoSample />
              <EducationalSample />
              <div className="col-span-2 sm:col-span-1">
                <ProductSample />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. HOW IT WORKS */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Getting Your Social Media Handled Is Simple.
            </h2>
            <p className="mt-4 font-semibold text-[#ed1c24]">Get started in less than 10 minutes.</p>
          </div>
          <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
            <span aria-hidden className="absolute left-[12%] right-[12%] top-7 hidden h-0.5 bg-[#080d16]/10 md:block" />
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title} className="relative text-center">
                <span
                  className={cn(
                    "relative mx-auto flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white ring-8 ring-white",
                    i === HOW_IT_WORKS.length - 1 ? "bg-[#ed1c24]" : "bg-[#080d16]",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 text-lg font-black">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-[260px] leading-7 text-black/60">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 8. WHO IT'S FOR */}
      <section className="bg-[#f6f6f7]">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="max-w-2xl">
            <Eyebrow>Built for</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Built for People Who Need Their Social Media to Just Work.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="overflow-hidden rounded-3xl bg-white">
                <AudienceArt kind={a.kind} />
                <div className="p-6">
                  <h3 className="text-xl font-black">{a.title}</h3>
                  <p className="mt-2 leading-7 text-black/60">{a.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. WHY RAELO */}
      <section className="bg-[#ed1c24] text-white">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-28">
          <div>
            <Eyebrow light>Why Raelo</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
              Why Hand Your Content to <span className="text-[#080d16]">Raelo?</span>
            </h2>
          </div>
          <ul className="divide-y divide-white/25 border-y border-white/25">
            {WHY.map((w) => (
              <li key={w.title} className="grid gap-2 py-6 sm:grid-cols-[1fr_1.1fr] sm:items-baseline sm:gap-8">
                <h3 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">{w.title}</h3>
                <p className="text-lg leading-7 text-white/85">{w.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 10. PACKAGES */}
      <section id="packages" className="scroll-mt-20 bg-[#f6f6f7]">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Packages</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Choose How Much of Your Social Media You Want <span className="text-[#ed1c24]">Off Your Plate.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-black/60">
              Whether you need a little creative support or want a complete content solution, choose the level
              that fits your business.
            </p>
          </div>

          {packages.length === 0 ? (
            <p className="mt-14 text-center text-black/50">
              Packages are being updated. Please check back shortly, or{" "}
              <a href={talkToUs} className="font-semibold text-[#ed1c24] hover:underline">talk to us</a>.
            </p>
          ) : (
            <div
              className={cn(
                "mx-auto mt-14 grid gap-5 md:grid-cols-2",
                packages.length === 3 && "max-w-[1100px] lg:grid-cols-3",
                packages.length >= 4 && "lg:grid-cols-4",
              )}
            >
              {packages.map((pkg, i) => (
                <PackageCard key={pkg.id} pkg={pkg} level={i + 1} levels={packages.length} />
              ))}
            </div>
          )}

          <div className="mx-auto mt-12 flex max-w-xl flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="font-semibold">Not sure which plan is right for you?</p>
            <a href={talkToUs} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#080d16] px-6 py-3 text-sm font-bold text-white transition hover:bg-black">
              Talk to us <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* 11. WORK (no testimonials yet, so the examples are the proof) */}
      <section id="examples" className="scroll-mt-20">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <Eyebrow>Our work</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                Content That Looks Like <span className="text-[#ed1c24]">Your Brand.</span>
              </h2>
            </div>
            <p className="text-lg leading-8 text-black/60 lg:max-w-md lg:justify-self-end">
              The same message, planned, designed and written with a purpose. This is the difference when your
              content is handled properly.
            </p>
          </div>
          <div className="mt-12">
            <ResultPairs />
          </div>
        </div>
      </section>

      {/* 12. FAQ */}
      <section id="faq" className="scroll-mt-20 bg-[#f6f6f7]">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-28">
          <div>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Questions? We&apos;ve Got Answers.
            </h2>
            <p className="mt-6 leading-7 text-black/60">
              Can&apos;t find what you&apos;re looking for?{" "}
              <a href={talkToUs} className="font-semibold text-[#ed1c24] hover:underline">Talk to us</a>.
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group rounded-2xl bg-white px-6 py-5 open:shadow-[0_10px_30px_-12px_rgba(8,13,22,0.15)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-bold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f6f6f7] text-[#ed1c24] transition group-open:rotate-45 group-open:bg-[#ed1c24] group-open:text-white">
                    <Plus className="h-4 w-4" />
                  </span>
                </summary>
                <p className="mt-4 leading-7 text-black/60">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 13. FINAL CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[2.5rem] bg-[#ed1c24] px-6 py-16 text-center text-white sm:px-12 lg:py-24">
          <span aria-hidden className="absolute -left-24 -top-24 hidden h-72 w-72 rounded-full bg-[#080d16] lg:block" />
          <span aria-hidden className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full border-[40px] border-white/15" />
          <div className="relative mx-auto max-w-3xl">
            <h2 className="text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
              You Have a Business to Run. <span className="text-[#080d16]">Let Raelo Handle the Content.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/85">
              Stop worrying about what to post, when to post, and how to stay consistent. We&apos;ve got your
              content covered.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <a href="#packages" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#080d16] px-8 py-4 text-sm font-bold text-white transition hover:bg-black">
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
              <a href={talkToUs} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-[#080d16] transition hover:bg-white/90">
                Talk to Us
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

      {assistant?.enabled && (
        <AssistantWidget name={assistant.assistantName} welcome={assistant.welcomeMessage} />
      )}
    </main>
  );
}

/** The deliverable that states how much content the plan includes, e.g. "12 posts per month". */
function contentVolume(deliverables: string[]) {
  return deliverables.find((d) => /\d/.test(d) && /post|piece|content/i.test(d)) ?? deliverables.find((d) => /post/i.test(d));
}

function PackageCard({ pkg, level, levels }: { pkg: PublicPackage; level: number; levels: number }) {
  const recommended = pkg.is_popular;
  const volume = contentVolume(pkg.deliverables);
  const rest = pkg.deliverables.filter((d) => d !== volume);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-3xl bg-white p-7",
        recommended ? "ring-2 ring-[#ed1c24] shadow-[0_24px_60px_-30px_rgba(237,28,36,0.6)]" : "ring-1 ring-black/[0.06]",
      )}
    >
      {recommended && (
        <span className="absolute -top-3 left-7 rounded-full bg-[#ed1c24] px-3 py-1 text-[11px] font-bold text-white">
          Recommended
        </span>
      )}
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[#ed1c24]">{pkg.name}</p>
      {pkg.description && <p className="mt-3 min-h-[3rem] leading-6 text-black/60">{pkg.description}</p>}

      <div className="mt-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/40">Off your plate</p>
        <div className="mt-2 flex gap-1" aria-label={`Support level ${level} of ${levels}`}>
          {Array.from({ length: levels }, (_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < level ? "bg-[#ed1c24]" : "bg-black/10")} />
          ))}
        </div>
      </div>

      {volume && <p className="mt-6 rounded-2xl bg-[#f6f6f7] px-4 py-3 text-lg font-black">{volume}</p>}

      <ul className="mt-5 flex-1 space-y-3 text-sm">
        {rest.map((item) => (
          <li key={item} className="flex gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ed1c24]" strokeWidth={3} />
            <span className="text-black/75">{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-8 flex flex-wrap items-baseline gap-x-2">
        <span className="text-3xl font-black tracking-tight xl:text-4xl">{formatPrice(pkg.price, pkg.currency)}</span>
        <span className="whitespace-nowrap text-sm text-black/50">{PERIOD[pkg.billing_period] ?? ""}</span>
      </p>

      <Link
        href={`/checkout/${pkg.slug}`}
        className={cn(
          "mt-6 flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-white transition",
          recommended ? "bg-[#ed1c24] hover:bg-[#c9141b]" : "bg-[#080d16] hover:bg-black",
        )}
      >
        Choose {pkg.name} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
