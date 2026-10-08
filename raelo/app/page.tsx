import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  Compass,
  Eye,
  Lightbulb,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  Palette,
  PenTool,
  Plus,
  Repeat,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  TrendingUp,
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
  CarouselSample,
  EducationalSample,
  HeroWorkspace,
  InstagramPostSample,
  ProductSample,
  PromoSample,
  ResultPairs,
} from "@/components/landing/visuals";

// Packages come from the database; re-fetch at most every 5 minutes.
export const revalidate = 300;

const VALUE_STRIP = [
  { icon: Compass, label: "Plan smarter" },
  { icon: PenTool, label: "Create better" },
  { icon: Repeat, label: "Stay consistent" },
  { icon: TrendingUp, label: "Grow your presence" },
];

const PROBLEMS = [
  { icon: Lightbulb, title: "No Ideas", text: "You don't know what to post next." },
  { icon: Clock, title: "No Time", text: "Content creation keeps competing with your actual business." },
  { icon: Repeat, title: "No Consistency", text: "Your audience doesn't hear from you regularly." },
  { icon: Target, title: "No Direction", text: "You're posting, but you're not sure what your content is achieving." },
];

const SERVICES = [
  { icon: Compass, title: "Content Strategy", text: "Know what you're saying, who you're speaking to, and why it matters." },
  { icon: Target, title: "Content Planning", text: "Turn your business goals into an organized content plan." },
  { icon: PenTool, title: "Content Creation", text: "Create content that fits your brand and speaks to your audience." },
  { icon: CalendarDays, title: "Content Calendar", text: "Know what to publish and when." },
  { icon: Palette, title: "Brand Consistency", text: "Keep your messaging and visual identity recognizable." },
];

const HOW_IT_WORKS = [
  { title: "Tell Us About Your Business", text: "Share your business, audience, goals, and content needs." },
  { title: "Build Your Content Direction", text: "Your information is turned into a clear content plan." },
  { title: "Create Your Content", text: "Content is developed around your brand and audience." },
  { title: "Show Up Consistently", text: "Use your content to stay visible and connected with your audience." },
];

const CONTENT_TYPES = [
  { icon: BookOpen, title: "Educate", text: "Share useful information that builds authority.", sample: "3 mistakes to avoid before you launch", tone: "bg-[#080d16] text-white" },
  { icon: MessageCircle, title: "Engage", text: "Start conversations and encourage your audience to interact.", sample: "This or that? Tell us below", tone: "bg-white text-[#080d16] ring-1 ring-black/10" },
  { icon: Megaphone, title: "Promote", text: "Showcase your products, services, offers, and campaigns.", sample: "New: the weekend bundle", tone: "bg-[#ed1c24] text-white" },
  { icon: ShieldCheck, title: "Build Trust", text: "Use stories, proof, testimonials, and behind-the-scenes content.", sample: "Behind the scenes: how we pack your order", tone: "bg-[#fde8e9] text-[#080d16]" },
  { icon: MousePointerClick, title: "Convert", text: "Turn attention into enquiries, customers, or action.", sample: "Book your slot today →", tone: "bg-[#fff5ea] text-[#080d16]" },
];

const AUDIENCES = [
  { icon: Store, title: "Small Businesses", text: "Build a stronger online presence without needing a full marketing team." },
  { icon: Rocket, title: "Startups", text: "Communicate your value while focusing on building the business." },
  { icon: UserRound, title: "Personal Brands", text: "Turn your expertise and personality into content people remember." },
  { icon: TrendingUp, title: "Growing Businesses", text: "Maintain consistency as your business and audience grow." },
];

const WHY = [
  { title: "Purpose Over Random Posting", text: "Every piece of content should have a reason." },
  { title: "Your Brand, Not a Template", text: "Your content should feel like your business." },
  { title: "Consistency Without the Stress", text: "Stop starting from zero every time you need a post." },
  { title: "Strategy + Creativity", text: "Great content needs both direction and creative execution." },
];

const EXPERIENCE = [
  { icon: Eye, title: "Discover", text: "We get to know your business, your audience and what you want to achieve." },
  { icon: Compass, title: "Plan", text: "Your goals become a content plan you can see and agree on." },
  { icon: PenTool, title: "Create", text: "Your posts and captions are made around your brand." },
  { icon: Check, title: "Review", text: "You look it over and ask for changes before anything goes out." },
  { icon: Rocket, title: "Publish", text: "Download from your portal and post with confidence." },
  { icon: TrendingUp, title: "Grow", text: "Month after month, your audience sees more of you." },
];

const GETTING_STARTED = [
  { title: "Choose Your Plan", text: "Pick the option that fits your current needs." },
  { title: "Tell Us About Your Brand", text: "Give us the information we need to understand your business." },
  { title: "Get Your Content", text: "We work on your content based on the agreed direction." },
  { title: "Start Showing Up", text: "Publish, connect with your audience, and keep growing." },
];

const FAQS = [
  {
    q: "What is Raelo?",
    a: "Raelo is a monthly content service from Twin Kreative. We plan and create social media content for your business (designed posts and captions) and deliver it to your private Raelo portal, ready to download and post.",
  },
  {
    q: "Who is Raelo for?",
    a: "Small businesses, startups, personal brands and growing businesses that want to show up online consistently without building a full marketing team.",
  },
  {
    q: "What type of content can I get?",
    a: "Designed social media posts with captions: educational posts, promotional graphics, product and service content, carousels and campaign content. The amount and the platforms covered depend on your package.",
  },
  {
    q: "How does the process work?",
    a: "Choose a plan and pay securely online. Fill in a short brand brief (your logo, colours, audience, goals and platforms). We plan and create your content around it, and each month's content appears in your portal for you to download and post.",
  },
  {
    q: "How long does content creation take?",
    a: "We start as soon as your brand brief is complete. We email you the moment your first batch is ready in your portal, and new content follows every month while your plan is active.",
  },
  {
    q: "Can Raelo work with my existing brand?",
    a: "Yes. Upload your logo and share your colours, fonts and tone of voice in your brand brief, and your content follows them. If you don't have brand guidelines yet, we work from what you share with us.",
  },
  {
    q: "Which package is right for me?",
    a: "Start with the plan that matches how many platforms you post on and how much content you need each month. If you're not sure, talk to us and we'll help you choose.",
  },
  {
    q: "How do I get started?",
    a: "Choose a plan in the Packages section, create your account and pay securely. Then fill in your brand brief and we'll take it from there.",
  },
];

// Shown when a package has no description in Admin → Packages.
const BEST_FOR: Record<string, string> = {
  starter: "For businesses ready to become consistent.",
  growth: "For businesses ready to build a stronger content presence.",
  scale: "For businesses that need a more complete content solution.",
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

function SecondaryButton({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-black/15 px-7 py-4 text-sm font-bold text-[#080d16] transition hover:border-black/40",
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
              <Sparkles className="h-3.5 w-3.5" /> Content strategy, planning and creation
            </p>
            <h1 className="mt-6 text-[40px] font-black leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[68px]">
              Stop Struggling With What to Post.{" "}
              <span className="text-[#ed1c24]">Start Showing Up With Purpose.</span>
            </h1>
            <p className="mt-6 max-w-[560px] text-lg leading-8 text-black/60">
              Raelo helps businesses plan, create, and manage better content so they can stay visible,
              communicate clearly, and build a stronger presence online.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href="#packages">
                Get Started <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
              <SecondaryButton href="#how-it-works">See How It Works</SecondaryButton>
            </div>
          </div>
          <HeroWorkspace />
        </div>
      </section>

      {/* 02 VALUE STRIP */}
      <section aria-label="What Raelo gives you" className="bg-[#080d16] text-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <p className="max-w-sm text-lg font-black leading-snug">
            Everything You Need to Build a Stronger Content Presence
          </p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 sm:gap-8">
            {VALUE_STRIP.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm font-semibold text-white/85">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ed1c24]">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 03 THE PROBLEM */}
      <section className="bg-[#f6f6f7]">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:py-28">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Your Business Is Busy.{" "}
              <span className="text-[#ed1c24]">Your Content Shouldn&apos;t Be.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-8 text-black/60">
              Running a business already demands your attention. Creating content shouldn&apos;t become
              another full-time job.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PROBLEMS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className={cn("rounded-3xl bg-white p-7 shadow-[0_10px_30px_-12px_rgba(8,13,22,0.12)]", i % 2 === 1 && "sm:translate-y-8")}>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fde8e9] text-[#ed1c24]">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-6 text-xl font-black">{title}</h3>
                <p className="mt-2 leading-7 text-black/60">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 04 THE SOLUTION */}
      <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-[1280px] gap-12 overflow-hidden rounded-[2rem] bg-[#080d16] p-6 text-white sm:p-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:p-16">
          <div>
            <Eyebrow>The solution</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Meet Raelo. <span className="text-[#ed1c24]">Your Content, With a Clearer Direction.</span>
            </h2>
            <p className="mt-6 text-lg leading-8 text-white/70">
              Raelo helps turn your business goals into organized, relevant, and engaging content.
            </p>
            <p className="mt-6 flex flex-wrap gap-x-3 text-2xl font-black tracking-tight">
              {["Plan.", "Create.", "Show Up.", "Grow."].map((word, i) => (
                <span key={word} className={i === 3 ? "text-[#ed1c24]" : undefined}>{word}</span>
              ))}
            </p>
            <p className="mt-4 leading-7 text-white/60">
              Instead of constantly wondering what to post, you have a clearer system for creating content
              that represents your business.
            </p>
            <PrimaryButton href="#what-we-do" className="mt-8">
              Discover Raelo <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </div>
          <BeforeAfter />
        </div>
      </section>

      {/* 05 WHAT RAELO HELPS YOU DO */}
      <section id="what-we-do" className="scroll-mt-20">
        <div className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-6 lg:px-10 lg:pb-28">
          <div className="max-w-2xl">
            <Eyebrow>What Raelo helps you do</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Everything Your Brand Needs to Show Up Better.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-6">
            {SERVICES.map(({ icon: Icon, title, text }, i) => (
              <div
                key={title}
                className={cn(
                  "flex flex-col justify-between rounded-3xl p-7",
                  i < 2 ? "md:col-span-3" : "md:col-span-2",
                  i === 0 && "bg-[#ed1c24] text-white",
                  i === 1 && "bg-[#080d16] text-white",
                  i > 1 && "bg-[#f6f6f7]",
                )}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    i < 2 ? "bg-white/15" : "bg-white text-[#ed1c24]",
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div className={i < 2 ? "mt-16" : "mt-10"}>
                  <h3 className={cn("font-black", i < 2 ? "text-2xl" : "text-xl")}>{title}</h3>
                  <p className={cn("mt-2 leading-7", i < 2 ? "text-white/75" : "text-black/60")}>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 06 HOW RAELO WORKS */}
      <section id="how-it-works" className="scroll-mt-20 bg-[#f6f6f7]">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>How Raelo works</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              From Your Business to Ready-to-Use Content.
            </h2>
          </div>
          <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
            <span aria-hidden className="absolute left-[12%] right-[12%] top-7 hidden h-0.5 bg-[#080d16]/10 md:block" />
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title} className="relative text-center">
                <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#080d16] text-lg font-black text-white ring-8 ring-[#f6f6f7]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 text-lg font-black">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-[260px] leading-7 text-black/60">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 07 CONTENT SHOWCASE */}
      <section id="work" className="scroll-mt-20 bg-[#080d16] text-white">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Eyebrow>Content showcase</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                See What Your Content Can Look Like.
              </h2>
            </div>
            <a href="#results" className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#080d16] transition hover:bg-white/90">
              Explore Our Work <ArrowRight className="h-4 w-4" />
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
            <div className="lg:col-span-7">
              <CampaignSample />
            </div>
            <div className="lg:col-span-5">
              <CalendarSample />
            </div>
          </div>
        </div>
      </section>

      {/* 08 CONTENT TYPES */}
      <section>
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <Eyebrow>Content with a job</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                Content That Does More Than Fill Your Feed.
              </h2>
            </div>
            <p className="text-lg leading-8 text-black/60 lg:max-w-md lg:justify-self-end">
              Every post has a job to do. A good mix keeps your audience learning, talking, trusting and buying.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {CONTENT_TYPES.map(({ icon: Icon, title, text, sample, tone }) => (
              <div key={title} className="flex flex-col rounded-3xl border border-black/[0.07] p-3">
                <div className={cn("flex aspect-[2/1] flex-col justify-between rounded-2xl p-4 sm:aspect-[4/3]", tone)}>
                  <Icon className="h-5 w-5 opacity-80" />
                  <p className="text-[15px] font-black leading-tight">{sample}</p>
                </div>
                <div className="px-2 pb-3 pt-4">
                  <h3 className="text-lg font-black">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-black/60">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 09 WHO RAELO IS FOR */}
      <section className="bg-[#f6f6f7]">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-28">
          <div>
            <Eyebrow>Who Raelo is for</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Built for Businesses Ready to Show Up Better.
            </h2>
          </div>
          <ul className="divide-y divide-black/10 border-y border-black/10">
            {AUDIENCES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-5 py-7">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#080d16] text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-xl font-black">{title}</h3>
                  <p className="mt-1 leading-7 text-black/60">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 10 WHY RAELO */}
      <section className="bg-[#ed1c24] text-white">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <Eyebrow light>Why Raelo</Eyebrow>
          <h2 className="mt-4 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
            Because Posting More Isn&apos;t the Goal. <span className="text-[#080d16]">Posting Better Is.</span>
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

      {/* 11 THE RAELO EXPERIENCE */}
      <section>
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>The Raelo experience</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Simple for You. <span className="text-[#ed1c24]">Powerful for Your Brand.</span>
            </h2>
          </div>
          <ol className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:gap-0">
            {EXPERIENCE.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative flex gap-4 rounded-2xl bg-[#f6f6f7] p-5 lg:flex-col lg:rounded-none lg:bg-transparent lg:p-0 lg:pr-6">
                <div className="flex items-center lg:w-full">
                  <span
                    className={cn(
                      "relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                      i === EXPERIENCE.length - 1 ? "bg-[#ed1c24] text-white" : "bg-[#080d16] text-white",
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  {i < EXPERIENCE.length - 1 && (
                    <span aria-hidden className="ml-3 hidden h-0.5 flex-1 bg-[repeating-linear-gradient(90deg,#080d16_0_8px,transparent_8px_14px)] opacity-20 lg:block" />
                  )}
                </div>
                <div className="lg:mt-6">
                  <h3 className="text-lg font-black">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-black/60">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 12 RESULTS */}
      <section id="results" className="scroll-mt-20 border-t border-black/[0.06]">
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
              has a clear direction.
            </p>
          </div>
          <div className="mt-12">
            <ResultPairs />
          </div>
        </div>
      </section>

      {/* 13 PACKAGES */}
      <section id="packages" className="scroll-mt-20 bg-[#f6f6f7]">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Packages</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Choose the Support Your Brand Needs.
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
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
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

      {/* 14 GETTING STARTED */}
      <section>
        <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:py-28">
          <div>
            <Eyebrow>Getting started</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Getting Started Is Easy.
            </h2>
            <ol className="mt-10 space-y-2">
              {GETTING_STARTED.map((step, i) => (
                <li key={step.title} className="flex gap-5 rounded-2xl p-4 transition hover:bg-[#f6f6f7]">
                  <span className="w-14 shrink-0 text-3xl font-black leading-none text-[#ed1c24]">{String(i + 1).padStart(2, "0")}.</span>
                  <div>
                    <h3 className="text-lg font-black">{step.title}</h3>
                    <p className="mt-1 leading-7 text-black/60">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] bg-[#080d16] p-8 text-white sm:p-10">
            <span aria-hidden className="absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-[#ed1c24]" />
            <div className="relative">
              <p className="text-3xl font-black leading-tight">Your first content plan is four steps away.</p>
              <ul className="mt-8 space-y-3 text-white/75">
                {["Secure online payment", "A short brand brief, done once", "Content delivered to your private portal"].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-[#ed1c24]" strokeWidth={3} /> {t}
                  </li>
                ))}
              </ul>
              <PrimaryButton href="#packages" className="mt-10 w-full sm:w-auto">
                Get Started <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </div>
        </div>
      </section>

      {/* 15 FAQ */}
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

      {/* 16 FINAL CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[2.5rem] bg-[#ed1c24] px-6 py-16 text-center text-white sm:px-12 lg:py-24">
          <span aria-hidden className="absolute -left-24 -top-24 hidden h-72 w-72 rounded-full bg-[#080d16] lg:block" />
          <span aria-hidden className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full border-[40px] border-white/15" />
          <div className="relative mx-auto max-w-3xl">
            <h2 className="text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
              Your Business Is Already Doing Great Things.{" "}
              <span className="text-[#080d16]">Now Give People a Reason to Notice.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/85">
              Raelo helps you turn what you do into content your audience can see, understand, and connect with.
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

function PackageCard({ pkg }: { pkg: PublicPackage }) {
  const popular = pkg.is_popular;
  const bestFor = pkg.description || BEST_FOR[pkg.slug] || BEST_FOR[pkg.name.toLowerCase()];
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
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[#ed1c24]">
        {pkg.name}
      </p>

      {bestFor && (
        <p className={cn("mt-3 min-h-[3rem] leading-6", popular ? "text-white/70" : "text-black/60")}>{bestFor}</p>
      )}

      <ul className={cn("mt-6 flex-1 space-y-3 border-t pt-6 text-sm", popular ? "border-white/10" : "border-black/[0.07]")}>
        {pkg.deliverables.map((item) => (
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
