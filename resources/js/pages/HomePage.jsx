import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { ArrowRight, Lock, Scissors, Layers, IndianRupee, Truck } from "lucide-react";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";
import { TwentyDaysBadge } from "@/components/Badges";
import PaymentTermsBox from "@/components/PaymentTermsBox";
import { PRODUCTS, COLORS, HERO_URL, FACTORY_URL, minBase } from "@/data/products";
import { inr, MOQ_SETS } from "@/lib/pricing";
import { useAuth } from "@/contexts/AuthContext";

const STEPS = [
  {
    icon: Layers,
    title: "Pick styles & colors",
    body: "Six core styles in five colorways — White, Black, Stone, Charcoal, Bone. Every color carries its own price, MOQ and stock status.",
  },
  {
    icon: Scissors,
    title: "Build your set",
    body: "Standard 4-pc set (M-1, L-1, XL-1, XXL-1) or 5-pc with S. Custom size ratios accepted — set your own M / L / XL / XXL quantities.",
  },
  {
    icon: IndianRupee,
    title: "Pay 100% advance",
    body: "Send the payment receipt on WhatsApp. Your order is confirmed within 6 hours — no confirmation, no production slot.",
  },
  {
    icon: Truck,
    title: "Dispatch in 20 days",
    body: "Cutting, stitching, QC and dispatch run on a 20-day estimate. Track every stage live on the tracking page.",
  },
];

const HomePage = () => {
  const { isAuthed } = useAuth();
  const featured = PRODUCTS.slice(0, 3);

  return (
    <div>
      <Helmet>
        <title>J.J. Serow Clothing Co. — Bulk Shirts & T-Shirts Wholesale, Set Wise</title>
        <meta
          name="description"
          content="B2B wholesale shirts and T-shirts for retailers. Bulk only, set wise only — 4 or 5 pc sets, MOQ 10 sets per color, 20 days estimate, 100% advance."
        />
      </Helmet>

      {/* HERO */}
      <section className="relative border-b border-foreground/60">
        <span className="vertical-label absolute left-1 top-24 hidden font-label text-[10px] uppercase tracking-[0.35em] text-foreground/40 lg:block">
          Wholesale only — Tirupur, IN
        </span>
        <div className="mx-auto grid max-w-[90rem] gap-10 px-4 pb-16 pt-14 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:pt-20">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground/60 sm:text-xs">
                B2B Wholesale — Shirts & Tees for Retailers
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-6 font-display text-[16vw] font-black leading-[0.92] tracking-tight sm:text-[11vw] lg:text-[6.8rem]">
                Bulk.
                <br />
                <span className="bg-accent px-3">Set wise.</span>
                <br />
                Built to last.
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-8 max-w-md text-base leading-relaxed text-foreground/75">
                No single pieces. No retail. One set is 4 pcs (M, L, XL, XXL) or 5 pcs with S —
                custom ratios welcome. Minimum 10 sets per color, dispatched on a 20-day estimate.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  to="/catalog"
                  className="flex h-12 items-center gap-2 bg-foreground px-6 font-label text-xs font-semibold uppercase tracking-[0.16em] text-background transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Browse the catalog <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/tracking"
                  className="flex h-12 items-center border border-foreground px-6 font-label text-xs font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-secondary"
                >
                  Track your order
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.32}>
              <div className="mt-12 grid grid-cols-2 gap-px border border-foreground/60 bg-foreground/60 sm:grid-cols-4">
                {[
                  `MOQ ${MOQ_SETS} sets / color`,
                  "5 colorways",
                  "20 days estimate",
                  "100% advance",
                ].map((s) => (
                  <div key={s} className="bg-background px-3 py-3 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/70">
                    {s}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={0.2} y={32}>
              <div className="relative">
                <div className="border border-foreground bg-card p-2 shadow-[10px_10px_0_0_hsl(var(--accent))]">
                  <img
                    src={HERO_URL}
                    alt="Folded stacks of premium wholesale shirts in white, black and stone"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
                <TwentyDaysBadge className="absolute -top-3 left-4 shadow-[3px_3px_0_0_hsl(var(--foreground))]" />
                <p className="mt-4 font-label text-[10px] uppercase tracking-[0.2em] text-foreground/50">
                  Fig. 01 — Set-wise folding, ready for retailer racks
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative border-b border-foreground/60">
        <span className="vertical-label absolute left-1 top-24 hidden font-label text-[10px] uppercase tracking-[0.35em] text-foreground/40 lg:block">
          Sec. 01 — Process
        </span>
        <div className="mx-auto max-w-[90rem] px-4 py-20 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
                How ordering works
              </h2>
              <p className="font-label text-[10px] uppercase tracking-[0.25em] text-foreground/50">
                Four steps — no exceptions
              </p>
            </div>
          </Reveal>
          <div className="mt-10 border-y border-foreground/60">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.06}>
                <div className="grid grid-cols-[auto_1fr] items-start gap-5 border-b border-foreground/30 py-7 last:border-b-0 sm:grid-cols-[80px_auto_1fr] sm:gap-8">
                  <span className="font-label text-sm text-foreground/40">0{i + 1}</span>
                  <s.icon className="mt-1 h-6 w-6" strokeWidth={1.75} />
                  <div>
                    <h3 className="font-display text-2xl font-bold">{s.title}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/70">{s.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED CATALOG */}
      <section className="relative border-b border-foreground/60 bg-secondary/40">
        <span className="vertical-label absolute left-1 top-24 hidden font-label text-[10px] uppercase tracking-[0.35em] text-foreground/40 lg:block">
          Sec. 02 — Catalog
        </span>
        <div className="mx-auto max-w-[90rem] px-4 py-20 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
                Featured catalog
              </h2>
              <Link
                to="/catalog"
                className="flex items-center gap-2 font-label text-[11px] font-semibold uppercase tracking-[0.18em] underline underline-offset-4 hover:text-foreground/70"
              >
                Full catalog <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.08}>
                <Link to={`/product/${p.id}`} className="group block">
                  <div className="relative border border-foreground bg-card p-2 shadow-[6px_6px_0_0_hsl(var(--accent))] transition-transform group-hover:-translate-y-1">
                    <img src={p.image} alt={p.name} className="aspect-[3/4] w-full object-cover" />
                    <TwentyDaysBadge className="absolute left-4 top-4" />
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl font-bold">{p.name}</h3>
                      <p className="mt-1 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                        {p.fabric} • MOQ {MOQ_SETS} sets
                      </p>
                      <div className="mt-2 flex gap-1.5">
                        {COLORS.map((c) => (
                          <span
                            key={c.name}
                            title={c.name}
                            className="h-3.5 w-3.5 border border-foreground/50"
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                    </div>
                    {isAuthed ? (
                      <span className="whitespace-nowrap font-label text-xs font-semibold">
                        from {inr(minBase(p))}/set
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 whitespace-nowrap font-label text-[10px] uppercase tracking-[0.12em] text-foreground/55">
                        <Lock className="h-3 w-3" /> Login for price
                      </span>
                    )}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHY SEROW */}
      <section className="relative border-b border-foreground/60">
        <span className="vertical-label absolute left-1 top-24 hidden font-label text-[10px] uppercase tracking-[0.35em] text-foreground/40 lg:block">
          Sec. 03 — The House
        </span>
        <div className="mx-auto grid max-w-[90rem] items-center gap-12 px-4 py-20 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Reveal>
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground/60">
                Why Serow
              </p>
              <h2 className="mt-5 font-display text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Named after a mountain goat that never slips.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/75">
                The serow climbs the steepest ridges of the Himalaya on sure feet. We built J.J.
                Serow Clothing Co. the same way: a narrow range, honest fabric, and production
                discipline that retailers can plan their racks around. Every style is cut, stitched
                and checked in Tirupur — and every order ships on a 20-day estimate we actually keep.
              </p>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-px border border-foreground/60 bg-foreground/60 sm:grid-cols-4">
              {[
                { v: 240, s: " GSM", l: "Heaviest knit" },
                { v: 5, s: "", l: "Colorways" },
                { v: 20, s: "", l: "Day estimate" },
                { v: 100, s: "%", l: "Advance terms" },
              ].map((stat) => (
                <div key={stat.l} className="bg-background px-3 py-4">
                  <p className="font-display text-3xl font-black">
                    <CountUp value={stat.v} suffix={stat.s} />
                  </p>
                  <p className="mt-1 font-label text-[9px] uppercase tracking-[0.16em] text-foreground/55">
                    {stat.l}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-6">
            <Reveal delay={0.15} y={32}>
              <div className="relative mx-auto max-w-xl">
                <div aria-hidden className="absolute inset-0 translate-x-4 translate-y-4 border border-foreground" />
                <img
                  src={FACTORY_URL}
                  alt="Cutting floor at the J.J. Serow partner factory in Tirupur"
                  className="relative w-full -rotate-1 scale-[1.02] border border-foreground object-cover"
                />
                <p className="mt-6 font-label text-[10px] uppercase tracking-[0.2em] text-foreground/50">
                  Fig. 02 — Cutting floor, Tirupur. One frame intentionally broken.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* TERMS BAND */}
      <section className="relative">
        <div className="mx-auto grid max-w-[90rem] items-center gap-8 px-4 py-16 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <PaymentTermsBox />
          </div>
          <div className="lg:col-span-5">
            <h2 className="font-display text-3xl font-black tracking-tight">Rate card, on paper.</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/70">
              Tier pricing for every style and color — 10–29 sets, 30–49 sets (−6%), 50+ sets (−12%).
              Print it, pin it, forward it to your purchase team.
            </p>
            <Link
              to="/rate-card"
              className="mt-6 inline-flex h-12 items-center gap-2 bg-foreground px-6 font-label text-xs font-semibold uppercase tracking-[0.16em] text-background transition-transform hover:-translate-y-0.5"
            >
              Download rate card <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
