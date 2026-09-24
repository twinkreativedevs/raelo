const problems = [
  {
    title: "You're not visible enough.",
    description:
      "Your audience isn't seeing your brand consistently, and you are losing potential customers.",
  },
  {
    title: "Your content feels repetitive.",
    description:
      "Without fresh ideas, your posts start to look the same and lose their impact.",
  },
  {
    title: "It takes too much time.",
    description:
      "Managing social media eats into your day, leaving you with less time for what really matters.",
  },
  {
    title: "You're not turning followers into customers.",
    description:
      "Great content means nothing if it doesn't bring real results.",
  },
];

const process = [
  {
    number: "01",
    title: "Pick Your Plan",
    description:
      "Choose the best package for your brand's needs and goals.",
  },
  {
    number: "02",
    title: "Pay Securely",
    description:
      "Complete checkout with Paystack. Your payment is safe and secure.",
  },
  {
    number: "03",
    title: "Share Your Brand",
    description:
      "Submit your brand details, logo, colours and any specific requirements.",
  },
  {
    number: "04",
    title: "Download & Post",
    description:
      "Get your content, ready to publish and start showing up.",
  },
];

const packages = [
  {
    name: "STARTER",
    price: "₦45,000",
    details: [
      "1 brand (1 platform)",
      "12 posts per month",
      "Basic engagement support",
    ],
  },
  {
    name: "GROWTH",
    price: "₦85,000",
    popular: true,
    details: [
      "1 brand (2 platforms)",
      "24 posts per month",
      "Advanced engagement support",
    ],
  },
  {
    name: "PRO",
    price: "₦145,000",
    details: [
      "1 brand (3 platforms)",
      "40 posts per month",
      "Premium engagement support",
    ],
  },
  {
    name: "BUSINESS",
    price: "₦320,000",
    details: [
      "Multiple brands (up to 5)",
      "Custom post volume",
      "Dedicated account manager",
    ],
  },
];

const audiences = [
  {
    title: "Business Owners",
    description:
      "Grow your brand, attract more customers and stay consistent without the hassle.",
  },
  {
    title: "Digital Marketers",
    description:
      "Scale your campaigns with professional content that delivers real engagement and results.",
  },
  {
    title: "Agencies",
    description:
      "Deliver more for your clients with reliable, high quality content without adding more work to your team.",
  },
];

const faqs = [
  "How does Raelo's social media service work?",
  "What if I don't like the content?",
  "Can I cancel anytime?",
  "Do I need to provide my own content?",
  "How long does it take to receive my first post(s)?",
  "Do you manage multiple platforms?",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-[#111827]">

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-6 lg:px-10">

          <a href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ed1c24] text-xl font-black text-white">
              R
            </div>
            <span className="text-xl font-bold text-[#ed1c24]">
              Raelo
            </span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#home" className="text-sm font-medium">
              Home
            </a>
            <a href="#how-it-works" className="text-sm font-medium">
              How It Works
            </a>
            <a href="#packages" className="text-sm font-medium">
              Packages
            </a>
            <a href="#results" className="text-sm font-medium">
              Results
            </a>
            <a href="#faq" className="text-sm font-medium">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#"
              className="hidden rounded-full border border-black/30 px-6 py-2.5 text-sm font-semibold md:block"
            >
              Login
            </a>

            <a
              href="#packages"
              className="rounded-full bg-[#ed1c24] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c9141b]"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="overflow-hidden">
        <div className="mx-auto grid min-h-[650px] max-w-[1280px] items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:px-10 lg:py-20">

          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[#ed1c24]">
              EVERY MONTH
            </p>

            <h1 className="max-w-[650px] text-5xl font-black leading-[0.94] tracking-[-0.04em] sm:text-6xl lg:text-[76px]">
              Your Social
              <br />
              Media.
              <br />
              <span className="text-[#ed1c24]">Handled.</span>
              <br />
              Every Month.
            </h1>

            <p className="mt-7 max-w-[560px] text-base leading-7 text-black/60">
              Raelo takes the stress out of social media. Get professional
              designs, engaging captions and consistent posting, so you can
              focus on what you do best.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#packages"
                className="rounded-full bg-[#ed1c24] px-7 py-4 text-sm font-bold text-white"
              >
                Get Started
                <span className="ml-3">→</span>
              </a>

              <a
                href="#how-it-works"
                className="rounded-full border border-black/25 px-7 py-4 text-sm font-bold"
              >
                Explore Services
              </a>
            </div>

            <div className="mt-10 grid max-w-[600px] grid-cols-3 gap-5 border-t border-black/10 pt-6">
              <div>
                <p className="text-sm font-bold">✓ Verified Pros</p>
                <p className="mt-1 text-xs text-black/50">
                  Trusted & Vetted
                </p>
              </div>

              <div>
                <p className="text-sm font-bold">▢ Secure Payments</p>
                <p className="mt-1 text-xs text-black/50">
                  Pay with confidence
                </p>
              </div>

              <div>
                <p className="text-sm font-bold">◷ On-Time Delivery</p>
                <p className="mt-1 text-xs text-black/50">
                  Your Time Matters
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-[560px] items-center justify-center">
            <div className="absolute h-[430px] w-[430px] rounded-[45%] bg-[#ed1c24] lg:h-[520px] lg:w-[520px]" />

            <div className="relative z-10 flex h-[470px] w-[380px] items-center justify-center rounded-[40%] bg-black/5">
              <span className="text-sm font-medium text-black/30">
                Raelo Hero Image
              </span>
            </div>

            <div className="absolute right-4 top-28 z-20 rounded-xl bg-white px-5 py-4 shadow-xl">
              <p className="text-xl font-black">+12.5%</p>
              <p className="text-xs text-black/50">Engagement</p>
            </div>
          </div>

        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-y border-black/5 bg-[#fafafa]">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-6 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-24">

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ed1c24]">
              THE PROBLEM
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              You're losing
              <br />
              the <span className="text-[#ed1c24]">feeling fight.</span>
            </h2>

            <p className="mt-6 max-w-[500px] leading-7 text-black/60">
              You work hard, create great content, and have a vision for your
              brand, but keeping up with social media is overwhelming. It's
              time-consuming, stressful and often feels like a losing battle.
            </p>

            <ul className="mt-7 space-y-4">
              <li>✓ Inconsistent posting and low engagement</li>
              <li>✓ Creative blocks and lack of fresh ideas</li>
              <li>✓ Hard to keep up with trends and algorithm changes</li>
              <li>✓ Wasting time on tasks that don't grow your brand</li>
            </ul>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {problems.map((problem) => (
              <div
                key={problem.title}
                className="rounded-2xl bg-[#ed1c24] p-7 text-white"
              >
                <h3 className="text-lg font-bold">{problem.title}</h3>
                <p className="mt-4 text-sm leading-6 text-white/80">
                  {problem.description}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SIMPLE PROCESS */}
      <section id="how-it-works" className="bg-[#fafafa]">
        <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-10 lg:py-24">

          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ed1c24]">
              SIMPLE PROCESS
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Up and running in <span className="text-[#ed1c24]">less</span>
              <br />
              <span className="text-[#ed1c24]">than 10 minutes.</span>
            </h2>

            <p className="mt-5 text-black/50">
              Four simple steps and you're all set. No stress, no tech skills,
              no hassle.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-4">
            {process.map((item) => (
              <div
                key={item.number}
                className="relative rounded-2xl bg-white p-7 shadow-[0_10px_35px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-[#ed1c24]">
                    ◇
                  </div>

                  <span className="text-2xl font-black text-[#ed1c24]">
                    {item.number}
                  </span>
                </div>

                <h3 className="mt-9 font-bold">{item.title}</h3>

                <p className="mt-3 text-sm leading-6 text-black/50">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SOLUTION */}
      <section className="px-6 pb-20 lg:px-10">
        <div className="mx-auto grid max-w-[1280px] overflow-hidden rounded-3xl bg-[#080d16] lg:grid-cols-2">

          <div className="flex min-h-[360px] items-center justify-center bg-black/20">
            <span className="text-sm text-white/30">
              Raelo Content Visual
            </span>
          </div>

          <div className="flex flex-col justify-center p-10 text-white lg:p-16">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ed1c24]">
              THE SOLUTION
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight">
              Up and running in
              <br />
              under <span className="text-[#ed1c24]">10 minutes.</span>
            </h2>

            <p className="mt-5 max-w-md text-sm leading-6 text-white/60">
              From strategy to stunning content, Raelo handles everything so
              you get results without the stress.
            </p>

            <a
              href="#packages"
              className="mt-7 w-fit rounded-full bg-[#ed1c24] px-6 py-3 text-sm font-bold"
            >
              View Packages →
            </a>
          </div>

        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages">
        <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-10 lg:py-24">

          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ed1c24]">
              OUR PACKAGES
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Choose the right plan
              <br />
              <span className="text-[#ed1c24]">for your brand.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {packages.map((item) => (
              <div
                key={item.name}
                className={`relative rounded-2xl border p-7 ${
                  item.popular
                    ? "border-[#ed1c24] bg-[#ed1c24] text-white shadow-xl"
                    : "border-black/10 bg-white"
                }`}
              >
                {item.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-black px-4 py-1 text-[10px] font-bold uppercase text-white">
                    Best Popular
                  </div>
                )}

                <p
                  className={`text-xs font-bold ${
                    item.popular ? "text-white/70" : "text-black/40"
                  }`}
                >
                  {item.name}
                </p>

                <h3 className="mt-3 text-3xl font-black">
                  {item.price}
                </h3>

                <div className="mt-7 space-y-3">
                  {item.details.map((detail) => (
                    <p
                      key={detail}
                      className={`text-sm ${
                        item.popular ? "text-white/80" : "text-black/60"
                      }`}
                    >
                      {detail}
                    </p>
                  ))}
                </div>

                <a
                  href="#"
                  className={`mt-8 block rounded-lg px-5 py-3 text-center text-sm font-bold ${
                    item.popular
                      ? "bg-white text-black"
                      : "bg-[#111827] text-white"
                  }`}
                >
                  Buy Package
                </a>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* BUILT FOR */}
      <section id="results" className="bg-[#080d16] text-white">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-24">

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ed1c24]">
              BUILT FOR
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
              Built for brands
              <br />
              that move with
              <br />
              <span className="text-[#ed1c24]">purpose.</span>
            </h2>

            <p className="mt-6 max-w-md leading-7 text-white/60">
              From busy business owners to high-performing agencies, Raelo
              helps brands stay consistent, creative and on-brand across every
              platform.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {audiences.map((audience) => (
              <div
                key={audience.title}
                className="overflow-hidden rounded-2xl bg-white/5"
              >
                <div className="flex h-40 items-center justify-center bg-white/10 text-sm text-white/20">
                  Image
                </div>

                <div className="p-6">
                  <h3 className="font-bold">{audience.title}</h3>

                  <p className="mt-3 text-sm leading-6 text-white/50">
                    {audience.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CONTENT CREATION */}
      <section>
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-24">

          <div className="flex min-h-[380px] items-center justify-center rounded-3xl bg-black/5">
            <span className="text-sm text-black/30">
              Raelo Content Image
            </span>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ed1c24]">
              HOW IT WORKS
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Content creation
              <br />
              made <span className="text-[#ed1c24]">effortless.</span>
            </h2>

            <p className="mt-5 max-w-md leading-7 text-black/55">
              From planning to publishing, Raelo handles the hard work so you
              can focus on your brand.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#packages"
                className="rounded-full bg-[#ed1c24] px-6 py-3 text-sm font-bold text-white"
              >
                Get Started Now →
              </a>

              <a
                href="#how-it-works"
                className="rounded-full border border-black/20 px-6 py-3 text-sm font-bold"
              >
                See How It Works
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#ed1c24] text-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-10">

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
              TAKE THE NEXT STEP
            </p>

            <h2 className="mt-2 text-4xl font-black leading-none">
              Stop winging it.
              <br />
              Start showing up.
            </h2>
          </div>

          <p className="max-w-md text-sm leading-6 text-white/80">
            Get professional social media content, designed for your brand,
            and delivered every month.
          </p>

          <a
            href="#packages"
            className="shrink-0 rounded-full bg-white px-7 py-4 text-sm font-bold text-black"
          >
            Get Started →
          </a>

        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="mx-auto max-w-[1000px] px-6 py-20 lg:py-24">

          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ed1c24]">
              FREQUENTLY ASKED QUESTIONS
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Questions answered.
            </h2>
          </div>

          <div className="grid gap-x-10 md:grid-cols-2">
            {faqs.map((question) => (
              <details
                key={question}
                className="group border-t border-black/10 py-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-sm font-semibold">
                  {question}

                  <span className="text-lg text-[#ed1c24]">
                    +
                  </span>
                </summary>

                <p className="mt-4 text-sm leading-6 text-black/50">
                  More information about this will be available here.
                </p>
              </details>
            ))}
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#080d16] text-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-6 py-12 lg:flex-row lg:items-center lg:justify-between lg:px-10">

          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ed1c24] text-xl font-black">
                R
              </div>

              <span className="text-xl font-bold">
                Raelo
              </span>
            </div>

            <p className="mt-3 text-sm text-white/40">
              Better Content. Stronger Brands.
            </p>
          </div>

          <nav className="flex flex-wrap gap-6 text-sm text-white/60">
            <a href="#home">Home</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#packages">Packages</a>
            <a href="#results">Results</a>
            <a href="#faq">FAQ</a>
          </nav>

          <p className="text-xs text-white/30">
            © 2026 Raelo. All rights reserved.
          </p>

        </div>
      </footer>

    </main>
  );
}