import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Check, Search } from "lucide-react";
import { TwentyDaysBadge } from "@/components/Badges";
import { LEAD_DAYS } from "@/lib/pricing";

const STEPS = [
  { label: "Payment Received", range: [1, 1], note: "100% advance confirmed on WhatsApp" },
  { label: "Cutting", range: [2, 6], note: "Fabric layered and cut set-wise" },
  { label: "Stitching", range: [7, 14], note: "Lines running colorwise" },
  { label: "QC", range: [15, 17], note: "Piece-by-piece quality check" },
  { label: "Dispatch", range: [18, 20], note: "Packed and handed to logistics" },
];

const dayFor = (code) => {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % LEAD_DAYS) + 1;
};

const TrackingPage = () => {
  const [code, setCode] = useState("JS-2041");
  const [tracked, setTracked] = useState("JS-2041");

  const day = tracked ? dayFor(tracked.toUpperCase()) : 0;
  const dispatchDate = new Date(Date.now() + (LEAD_DAYS - day) * 86400000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="relative">
      <Helmet>
        <title>Track Your Bulk Order — J.J. Serow Clothing Co.</title>
        <meta
          name="description"
          content="Track your set-wise bulk order through payment, cutting, stitching, QC and dispatch — on a 20 days estimate."
        />
      </Helmet>
      <span className="vertical-label absolute left-1 top-24 hidden font-label text-[10px] uppercase tracking-[0.35em] text-foreground/40 lg:block">
        Tracking — 20 days
      </span>

      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-8">
        <p className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground/60">
          Order tracking
        </p>
        <h1 className="mt-4 font-display text-5xl font-black tracking-tight">Where is my order?</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/70">
          Enter the order code from your WhatsApp confirmation. Production runs on a 20-day estimate
          from payment confirmation.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setTracked(code.trim());
          }}
          className="mt-8 flex max-w-xl gap-2"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. JS-2041"
            className="h-12 flex-1 border border-foreground/60 bg-transparent px-4 font-label text-sm uppercase tracking-[0.14em] focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          <button
            type="submit"
            className="flex h-12 items-center gap-2 bg-foreground px-5 font-label text-xs font-semibold uppercase tracking-[0.16em] text-background"
          >
            <Search className="h-4 w-4" /> Track
          </button>
        </form>

        {tracked && (
          <div className="mt-12 border border-foreground bg-card p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-label text-[10px] uppercase tracking-[0.2em] text-foreground/55">
                  Order {tracked.toUpperCase()}
                </p>
                <p className="mt-1 font-display text-3xl font-black">
                  Day {day} of {LEAD_DAYS}
                </p>
              </div>
              <TwentyDaysBadge />
            </div>

            <div className="mt-6">
              <div className="h-3 w-full border border-foreground/60 bg-background">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${(day / LEAD_DAYS) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                <span>Payment confirmed</span>
                <span>Est. dispatch — {dispatchDate}</span>
              </div>
            </div>

            <div className="mt-8 border-t border-foreground/40">
              {STEPS.map((s, i) => {
                const done = day > s.range[1];
                const current = day >= s.range[0] && day <= s.range[1];
                return (
                  <div
                    key={s.label}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-foreground/20 py-4 last:border-b-0 ${
                      current ? "bg-accent/30 -mx-2 px-2" : ""
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center border font-label text-xs ${
                        done
                          ? "border-foreground bg-foreground text-background"
                          : current
                            ? "border-foreground bg-accent text-accent-foreground"
                            : "border-foreground/40 text-foreground/40"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <div>
                      <p className="font-display text-lg font-bold">{s.label}</p>
                      <p className="font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                        {s.note} • Days {s.range[0]}–{s.range[1]}
                      </p>
                    </div>
                    <span className="font-label text-[10px] uppercase tracking-[0.14em] text-foreground/50">
                      {done ? "Done" : current ? "In progress" : "Queued"}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/50">
              Live updates are also sent on WhatsApp at every stage change.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingPage;
