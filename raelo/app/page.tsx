import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Check,
  Clock,
  Compass,
  Lightbulb,
  Palette,
  PenTool,
  Plus,
  Repeat,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Type,
  UserRound,
} from "lucide-react";

import { formatPrice, getActivePackages, type PublicPackage } from "@/lib/packages";
import { getPublicAssistant } from "@/lib/assistant";
import { getSettingValue } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { AssistantWidget } from "@/components/assistant-widget";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import {
  BeforeAfter,
  CalendarSample,
  CampaignSample,
  CaptionSample,
  CarouselSample,
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

const PROBLEMS = [
  { icon: Lightbulb, title: "No Ideas", quote: "“What should we post today?”", text: "You shouldn't have to start from a blank page every time." },
  { icon: Clock, title: "No Time", text: "Your business needs your attention. Content shouldn't consume your day." },
  { icon: Repeat, title: "No Consistency", text: "Busy weeks shouldn't mean disappearing from your audience." },
  { icon: Target, title: "No Direction", text: "Posting more doesn't automatically mean growing. Your content needs purpose." },
];

const HANDLED = [
  { icon: Compass, title: "Content Strategy", text: "Know what you should be communicating and why." },
  { icon: Lightbulb, title: "Content Ideas", text: "Never start from a blank page wondering what to post." },
  { icon: PenTool, title: "Content Creation", text: "Get professionally created content built around your brand." },
  { icon: Type, title: "Captions", text: "Clear, engaging copy that supports the content." },
  { icon: CalendarDays, title: "Content Calendar", text: "Know what is coming and when it should be published." },
  { icon: Palette, title: "Brand Consistency", text: "Keep your content looking and sounding like your business." },
];

const HOW_IT_WORKS = [
  { title: "Tell Us About Your Brand", text: "Share your business, audience, goals, offers, and content needs." },
  { title: "We Plan", text: "We turn your information into a clear content direction." },
  { title: "We Create", text: "We create content around your brand and audience." },
  { title: "You Receive", text: "Your content is organized and ready for you to use." },
];

const AUDIENCES = [
  { icon: Store, title: "Business Owners", quote: "I need my business to stay active online, but I don't have time to manage social media every day." },
  { icon: TrendingUp, title: "Growing Brands", quote: "Our business is growing and our online presence needs to grow with it." },
  { icon: UserRound, title: "Personal Brands", quote: "I have things to say, but I struggle to turn them into consistent content." },
  { icon: Briefcase, title: "Marketing Teams & Agencies", quote: "We need reliable content production without adding more workload." },
];

const WHY = [
  { title: "Purpose Over Random Posting", text: "Every piece of content should have a reason." },
  { title: "Built Around Your Brand", text: "Your content should feel like your business." },
  { title: "Consistency Without the Stress", text: "You shouldn't have to restart your content every week." },
  { title: "Strategy + Creativity", text: "Good content needs both a clear direction and creative execution." },
];

const GETTING_STARTED = ["Choose Your Plan", "Tell Us About Your Brand", "We Create", "You Stay Consistent"];

const FAQS = [
  {
    q: "What is Raelo?",
    a: "Raelo is a monthly social media content service from Twin Kreative. We plan and create your posts and captions, and deliver them to your private Raelo portal, organised and ready to publish. You focus on your business; we keep your content moving.",
  },
  {
    q: "Who is Raelo for?",
    a: "Business owners, growing brands, personal brands, and marketing teams or agencies who want to stay active online without managing every part of their social media themselves.",
  },
  {
    q: "What type of content do you create?",
    a: "Designed social media posts with captions: Instagram posts, carousels, promotional posts, educational posts, product and service posts, and campaign content, planned on a content calendar. The amount and the platforms covered depend on your plan.",
  },
  {
    q: "How much work do I need to do?",
    a: "Very little. Fill in your brand brief once, then download your content from your portal and publish it. Keep your brief up to date when something changes (a new offer, a new product) and tell us if you'd like anything adjusted.",
  },
  {
    q: "What information do you need from me?",
    a: "Your business name and industry, who your audience is, your brand voice, your content goals and the platforms you use. You can also add your logo, brand colours, competitors you admire and a link to any photos you'd like us to use.",
  },
  {
    q: "Can you work with my existing brand?",
    a: "Yes. Upload your logo and share your colours and tone of voice in your brand brief, and your content follows them. If you don't have brand guidelines yet, we work from what you share with us.",
  },
  {
    q: "How does the process work?",
    a: "Choose a plan and pay securely online. Tell us about your brand in a short brief. We plan your content direction and create your posts and captions. Your content arrives in your portal, organised and ready to use.",
  },
  {
    q: "How long does it take to receive my content?",
    a: "We start as soon as your brand brief is complete, and we email you the moment your first batch is ready in your portal. New content follows every month while your plan is active.",
  },
  {
    q: "Which plan is right for my business?",
    a: "Pick the plan that matches how many platforms you post on and how much content you need each month. If you're not sure, talk to us and we'll help you choose.",
  },
];

// Shown when a package has no description in Admin → Packages.
const BEST_FOR: Record<string, string> = {
  starter: "For businesses that need help staying consistent.",
  growth: "For businesses ready to build a stronger content presence.",
  scale: "For businesses that want a more complete content solution.",
};

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

      {/* 01 HERO */}
      <section id="home">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-10 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#fde8e9] px-3.5 py-1.5 text-xs font-bold text-[#c9141b]">
              <Sparkles className="h-3.5 w-3.5" /> Monthly social media content, done for you
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
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/15 px-7 py-4 text-sm font-bold transition hover:border-black/40"
              >
                See How It Works
              </a>
            </div>
          </div>
          <HeroWorkspace />
        </div>
      </section>

      {/* 02 THE RELIEF */}
      <section className="bg-[#080d16] text-white">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:py-24">
          <div>
            <h2 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              You Have a Business to Run.{" "}
              <span className="text-white/45">You Shouldn&apos;t Have to Worry About What to Post.</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
              Running a business already takes enough time. Coming up with content ideas, writing captions,
              designing posts, and keeping your social media active shouldn&apos;t become another full-time job.
            </p>
            <p className="mt-4 max-w-xl text-lg font-semibold leading-8">
              With Raelo, you don&apos;t have to start from a blank screen every week.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-3xl bg-white/[0.06] p-7 ring-1 ring-white/10">
              <p className="text-xs font-bold tracking-[0.16em] text-white/50">YOU</p>
              <p className="mt-2 text-2xl font-black sm:text-3xl">You focus on your business.</p>
            </div>
            <div className="rounded-3xl bg-[#ed1c24] p-7">
              <p className="text-xs font-bold tracking-[0.16em] text-white/70">RAELO</p>
              <p className="mt-2 text-2xl font-black sm:text-3xl">Raelo helps keep your social media moving.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 03 THE PROBLEM */}
      <section className="bg-[#f6f6f7]">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:py-28">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Keeping Up With Social Media Is <span className="text-[#ed1c24]">Exhausting.</span>
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PROBLEMS.map(({ icon: Icon, title, quote, text }, i) => (
              <div key={title} className={cn("rounded-3xl bg-white p-7 shadow-[0_10px_30px_-12px_rgba(8,13,22,0.12)]", i % 2 === 1 && "sm:translate-y-8")}>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fde8e9] text-[#ed1c24]">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-6 text-xl font-black">{title}</h3>
                {quote && <p className="mt-2 font-semibold text-[#080d16]">{quote}</p>}
                <p className="mt-2 leading-7 text-black/60">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 04 MEET RAELO */}
      <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-[1280px] gap-12 overflow-hidden rounded-[2rem] bg-[#080d16] p-6 text-white sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:p-16">
          <div>
            <Eyebrow>Meet Raelo</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Meet Raelo. <span className="text-[#ed1c24]">Your Social Media, Without the Stress.</span>
            </h2>
            <p className="mt-6 text-lg leading-8 text-white/70">
              Raelo helps turn your business goals into organized, relevant, and engaging content, so you can
              stay visible without constantly managing every part of your social media yourself.
            </p>
            <p className="mt-6 flex flex-wrap gap-x-3 text-3xl font-black tracking-tight">
              <span>Plan.</span>
              <span>Create.</span>
              <span className="text-[#ed1c24]">Stay Consistent.</span>
            </p>
            <p className="mt-4 leading-7 text-white/60">
              We help with the planning, content ideas, creation, organization, and delivery needed to keep
              your social media active.
            </p>
            <PrimaryButton href="#what-we-handle" className="mt-8">
              See What Raelo Handles <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </div>
          <HandledVisual />
        </div>
      </section>

      {/* 05 WHAT WE HANDLE */}
      <section id="what-we-handle" className="scroll-mt-20">
        <div className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-6 lg:px-10 lg:pb-28">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <Eyebrow>What we handle for you</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                We Handle the Content Work. <span className="text-[#ed1c24]">You Handle the Business.</span>
              </h2>
            </div>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HANDLED.map(({ icon: Icon, title, text }, i) => (
              <div
                key={title}
                className={cn(
                  "flex flex-col justify-between rounded-3xl p-7",
                  i < 2 && "lg:col-span-2",
                  i === 0 && "bg-[#ed1c24] text-white",
                  i === 1 && "bg-[#080d16] text-white",
                  i > 1 && "bg-[#f6f6f7]",
                )}
              >
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", i < 2 ? "bg-white/15" : "bg-white text-[#ed1c24]")}>
                  <Icon className="h-6 w-6" />
                </span>
                <div className={i < 2 ? "mt-14" : "mt-10"}>
                  <h3 className={cn("font-black", i < 2 ? "text-2xl" : "text-xl")}>{title}</h3>
                  <p className={cn("mt-2 leading-7", i < 2 ? "text-white/75" : "text-black/60")}>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 06 CONTENT SHOWCASE */}
      <section id="work" className="scroll-mt-20 bg-[#080d16] text-white">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Eyebrow>What you get</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                This Is What “Social Media Handled” Looks Like.
              </h2>
            </div>
            <a href="#examples" className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#080d16] transition hover:bg-white/90">
              Explore the Content <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-5 lg:row-span-2">
              <InstagramPostSample />
            </div>
            <div className="lg:col-span-7">
              <CarouselSample />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:col-span-2 lg:col-span-7">
              <PromoSample />
              <EducationalSample />
              <div className="col-span-2 sm:col-span-1">
                <ProductSample />
              </div>
            </div>
            <div className="lg:col-span-5">
              <CampaignSample />
            </div>
            <div className="lg:col-span-3">
              <CaptionSample />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <CalendarSample />
            </div>
          </div>
        </div>
      </section>

      {/* 07 BEFORE VS AFTER */}
      <section className="bg-[#f6f6f7]">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Before vs after</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              From Content Stress to <span className="text-[#ed1c24]">Content Under Control.</span>
            </h2>
          </div>
          <div className="mt-12">
            <BeforeAfter />
          </div>
        </div>
      </section>

      {/* 08 HOW IT WORKS */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>How Raelo works</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Getting Your Social Media Handled Is Simple.
            </h2>
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

      {/* 09 WHO IT'S FOR */}
      <section className="bg-[#f6f6f7]">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="max-w-2xl">
            <Eyebrow>Who Raelo is for</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Built for People Who Have a Business to Run.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map(({ icon: Icon, title, quote }, i) => (
              <figure key={title} className="flex flex-col overflow-hidden rounded-3xl bg-white">
                <div
                  aria-hidden
                  className={cn(
                    "relative flex h-28 items-end overflow-hidden p-5",
                    ["bg-[#ed1c24] text-white", "bg-[#080d16] text-white", "bg-[#fde8e9] text-[#080d16]", "bg-[#fff5ea] text-[#080d16]"][i],
                  )}
                >
                  <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full border-[14px] border-current opacity-10" />
                  <Icon className="h-8 w-8" />
                </div>
                <blockquote className="flex-1 p-6 text-[17px] font-semibold leading-7">“{quote}”</blockquote>
                <figcaption className="px-6 pb-6 text-sm font-black text-[#ed1c24]">{title}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 10 WHY RAELO */}
      <section className="bg-[#ed1c24] text-white">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <Eyebrow light>Why Raelo</Eyebrow>
          <h2 className="mt-4 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
            Because Your Social Media Deserves <span className="text-[#080d16]">More Than Random Posts.</span>
          </h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-white/20 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((item, i) => (
              <div key={item.title} className="bg-[#ed1c24] p-7">
                <p className="text-sm font-black text-white/60">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-8 text-xl font-black leading-tight">{item.title}</h3>
                <p className="mt-2 leading-7 text-white/80">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11 PORTFOLIO (in place of social proof until there are real testimonials) */}
      <section id="examples" className="scroll-mt-20">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <Eyebrow>The difference</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                See the Work. <span className="text-[#ed1c24]">Feel the Difference.</span>
              </h2>
            </div>
            <p className="text-lg leading-8 text-black/60 lg:max-w-md lg:justify-self-end">
              The same message, written and designed with a purpose. This is what changes when your content
              is handled properly.
            </p>
          </div>
          <div className="mt-12">
            <ResultPairs />
          </div>
        </div>
      </section>

      {/* 12 PACKAGES */}
      <section id="packages" className="scroll-mt-20 bg-[#f6f6f7]">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Packages</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Choose How Much of Your Social Media You Want <span className="text-[#ed1c24]">Off Your Plate.</span>
            </h2>
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

      {/* 13 GETTING STARTED */}
      <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1280px] rounded-[2rem] bg-[#080d16] p-6 text-white sm:p-10 lg:p-16">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
            <h2 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Getting Started Is <span className="text-[#ed1c24]">Easier Than You Think.</span>
            </h2>
            <p className="text-lg leading-8 text-white/70">
              You don&apos;t need to become a social media expert. You just need to tell us about your business
              and let us help handle the content.
            </p>
          </div>
          <ol className="mt-12 grid gap-3 md:grid-cols-4">
            {GETTING_STARTED.map((step, i) => (
              <li key={step} className="relative flex items-center gap-4 rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black", i === 3 ? "bg-[#ed1c24]" : "bg-white text-[#080d16]")}>
                  {i + 1}
                </span>
                <span className="font-bold">{step}</span>
                {i < GETTING_STARTED.length - 1 && (
                  <ArrowRight aria-hidden className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-[#ed1c24] md:block" />
                )}
              </li>
            ))}
          </ol>
          <PrimaryButton href="#packages" className="mt-10">
            Get Started <ArrowRight className="h-4 w-4" />
          </PrimaryButton>
        </div>
      </section>

      {/* 14 FAQ */}
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

      {/* 15 FINAL CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[2.5rem] bg-[#ed1c24] px-6 py-16 text-center text-white sm:px-12 lg:py-24">
          <span aria-hidden className="absolute -left-24 -top-24 hidden h-72 w-72 rounded-full bg-[#080d16] lg:block" />
          <span aria-hidden className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full border-[40px] border-white/15" />
          <div className="relative mx-auto max-w-3xl">
            <h2 className="text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
              You Have a Business to Run. <span className="text-[#080d16]">Let Raelo Handle the Content.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/85">
              Stop worrying about what to post, when to post, and how to stay consistent. Let Raelo help you keep
              your brand visible while you focus on what matters most: running and growing your business.
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
  const popular = pkg.is_popular;
  const bestFor = pkg.description || BEST_FOR[pkg.slug] || BEST_FOR[pkg.name.toLowerCase()];
  const volume = contentVolume(pkg.deliverables);
  const rest = pkg.deliverables.filter((d) => d !== volume);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-3xl p-7",
        popular ? "bg-[#080d16] text-white shadow-2xl lg:-my-3 lg:py-10" : "bg-white",
      )}
    >
      {popular && (
        <span className="absolute right-6 top-6 rounded-full bg-[#ed1c24] px-3 py-1 text-[11px] font-bold text-white">
          Most popular
        </span>
      )}
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[#ed1c24]">{pkg.name}</p>
      {bestFor && <p className={cn("mt-3 min-h-[3rem] leading-6", popular ? "text-white/70" : "text-black/60")}>{bestFor}</p>}

      <div className="mt-5">
        <p className={cn("text-[11px] font-bold uppercase tracking-[0.14em]", popular ? "text-white/50" : "text-black/40")}>
          Off your plate
        </p>
        <div className="mt-2 flex gap-1" aria-label={`Support level ${level} of ${levels}`}>
          {Array.from({ length: levels }, (_, i) => (
            <span
              key={i}
              className={cn("h-1.5 flex-1 rounded-full", i < level ? "bg-[#ed1c24]" : popular ? "bg-white/15" : "bg-black/10")}
            />
          ))}
        </div>
      </div>

      {volume && (
        <p className={cn("mt-6 rounded-2xl px-4 py-3 text-lg font-black", popular ? "bg-white/10" : "bg-[#f6f6f7]")}>{volume}</p>
      )}

      <ul className="mt-5 flex-1 space-y-3 text-sm">
        {rest.map((item) => (
          <li key={item} className="flex gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ed1c24]" strokeWidth={3} />
            <span className={popular ? "text-white/85" : "text-black/75"}>{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-8 flex flex-wrap items-baseline gap-x-2">
        <span className="text-3xl font-black tracking-tight xl:text-4xl">{formatPrice(pkg.price, pkg.currency)}</span>
        <span className={cn("whitespace-nowrap text-sm", popular ? "text-white/60" : "text-black/50")}>{PERIOD[pkg.billing_period] ?? ""}</span>
      </p>

      <Link
        href={`/checkout/${pkg.slug}`}
        className={cn(
          "mt-6 flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition",
          popular ? "bg-[#ed1c24] text-white hover:bg-[#c9141b]" : "bg-[#080d16] text-white hover:bg-black",
        )}
      >
        Choose {pkg.name} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
