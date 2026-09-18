export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-black/10">
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <a href="/" className="text-2xl font-bold">
            Raelo
          </a>

          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a href="#home">Home</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#packages">Packages</a>
            <a href="#results">Results</a>
            <a href="#faq">FAQ</a>
          </div>

          <a
            href="#packages"
            className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
          >
            Get Started
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section
        id="home"
        className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-28"
      >
        <div>
          <p className="mb-5 text-sm font-bold uppercase tracking-widest text-red-600">
            Every Month
          </p>

          <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Your Social Media. Handled. Every Month.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-black/60">
            Consistent, quality content for your brand without the stress of
            creating it yourself.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#packages"
              className="rounded-full bg-red-600 px-7 py-4 font-semibold text-white"
            >
              Choose Your Plan
            </a>

            <a
              href="#how-it-works"
              className="rounded-full border border-black/20 px-7 py-4 font-semibold"
            >
              How It Works
            </a>
          </div>
        </div>

        <div className="flex min-h-[500px] items-center justify-center rounded-3xl bg-black/5">
          <p className="text-sm text-black/40">
            Raelo Hero Image
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-black px-6 py-20 text-white lg:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-widest text-red-500">
            The Problem
          </p>

          <h2 className="mt-4 max-w-3xl text-4xl font-bold md:text-6xl">
            You’re losing the feeling fight.
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {[
              "Your audience is not seeing you enough.",
              "Your content feels repetitive.",
              "Creating content takes too much time.",
              "Your followers are not turning into customers.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white/10 p-8"
              >
                <p className="text-xl font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28"
      >
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-widest text-red-600">
            How It Works
          </p>

          <h2 className="mt-4 text-4xl font-bold md:text-6xl">
            Up and running in less than 10 minutes.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            ["01", "Pick Your Plan"],
            ["02", "Pay Securely"],
            ["03", "Share Your Brand"],
            ["04", "Download & Post"],
          ].map(([number, title]) => (
            <div
              key={number}
              className="rounded-2xl border border-black/10 p-7"
            >
              <span className="text-sm font-bold text-red-600">
                {number}
              </span>

              <h3 className="mt-10 text-xl font-bold">{title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Existing Visual / Explanation */}
      <section className="bg-black/5 px-6 py-20 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div className="min-h-[450px] rounded-3xl bg-white">
            <div className="flex h-full min-h-[450px] items-center justify-center">
              <p className="text-sm text-black/40">
                Raelo Content Visual
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-red-600">
              Simple Process
            </p>

            <h2 className="mt-4 text-4xl font-bold md:text-5xl">
              Up and running in under 10 minutes.
            </h2>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section
        id="packages"
        className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28"
      >
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-widest text-red-600">
            Packages
          </p>

          <h2 className="mt-4 text-4xl font-bold md:text-6xl">
            Choose the right plan for your brand.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["Starter", "₦45,000"],
            ["Growth", "₦85,000"],
            ["Pro", "₦145,000"],
            ["Agency", "₦320,000"],
          ].map(([name, price]) => (
            <div
              key={name}
              className="rounded-3xl border border-black/10 p-7"
            >
              <h3 className="text-2xl font-bold">{name}</h3>

              <p className="mt-6 text-3xl font-bold">{price}</p>

              <a
                href="#"
                className="mt-8 block rounded-full bg-black px-5 py-4 text-center font-semibold text-white"
              >
                Choose Plan
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Built For */}
      <section className="bg-black px-6 py-20 text-white lg:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-widest text-red-500">
            Built For
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {["Business Owners", "Digital Marketers", "Agencies"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-white/10 p-8"
                >
                  <h3 className="text-2xl font-bold">{item}</h3>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Content Creation */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-widest text-red-600">
            How It Works
          </p>

          <h2 className="mt-4 text-4xl font-bold md:text-6xl">
            Content creation made effortless.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            ["01", "Choose Your Plan"],
            ["02", "Secure Checkout"],
            ["03", "Submit Your Brand"],
            ["04", "Receive & Publish"],
          ].map(([number, title]) => (
            <div
              key={number}
              className="rounded-2xl border border-black/10 p-7"
            >
              <span className="text-sm font-bold text-red-600">
                {number}
              </span>

              <h3 className="mt-10 text-xl font-bold">{title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20 lg:px-10 lg:pb-28">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-red-600 px-8 py-20 text-white md:px-16">
          <h2 className="max-w-3xl text-4xl font-bold md:text-6xl">
            Stop winging it. Start showing up.
          </h2>

          <div className="mt-8">
            <a
              href="#packages"
              className="inline-block rounded-full bg-white px-7 py-4 font-semibold text-black"
            >
              Get Started
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="mx-auto max-w-4xl px-6 py-20 lg:py-28"
      >
        <p className="text-sm font-bold uppercase tracking-widest text-red-600">
          FAQ
        </p>

        <h2 className="mt-4 text-4xl font-bold md:text-6xl">
          Questions answered.
        </h2>

        <div className="mt-10 divide-y divide-black/10">
          {[
            "How does Raelo work?",
            "What do I get with my plan?",
            "How quickly will I receive my content?",
            "Can I change my plan?",
          ].map((question) => (
            <details key={question} className="py-6">
              <summary className="cursor-pointer text-lg font-semibold">
                {question}
              </summary>

              <p className="mt-4 text-black/60">
                More information about this will be displayed here.
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 px-6 py-10 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row">
          <p className="font-bold">Raelo</p>

          <p className="text-sm text-black/50">
            © {new Date().getFullYear()} Raelo. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}