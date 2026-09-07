import React from "react";
import { Helmet } from "react-helmet";
import { Printer } from "lucide-react";
import PaymentTermsBox from "@/components/PaymentTermsBox";
import { PRODUCTS, COLORS, LOGO_URL, colorBase } from "@/data/products";
import {
  LEAD_DAYS,
  MOQ_SETS,
  PRIVATE_LABEL_PER_PC,
  SAMPLE_SET_PRICE,
  discountedSetBase,
  inr,
} from "@/lib/pricing";

const RateCardPage = () => (
  <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8">
    <Helmet>
      <title>Wholesale Rate Card — J.J. Serow Clothing Co.</title>
      <meta
        name="description"
        content="Full colorwise wholesale rate card: tier pricing for 10–29, 30–49 and 50+ sets across all styles and colors. 20 days estimate, 100% advance."
      />
    </Helmet>

    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="flex items-center gap-4">
        <img src={LOGO_URL} alt="J.J. Serow goat head logo" className="h-14 w-14 border border-foreground/60 object-cover" />
        <div>
          <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">Rate Card</h1>
          <p className="mt-1 font-label text-[10px] uppercase tracking-[0.25em] text-foreground/55">
            J.J. Serow Clothing Co. — Wholesale only • Valid {new Date().getFullYear()}
          </p>
        </div>
      </div>
      <button
        onClick={() => window.print()}
        className="flex h-12 items-center gap-2 bg-foreground px-6 font-label text-xs font-semibold uppercase tracking-[0.16em] text-background print:hidden"
      >
        <Printer className="h-4 w-4" /> Download PDF
      </button>
    </div>

    <div className="mt-6 grid gap-2 border border-foreground/60 bg-secondary/40 p-4 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/70 sm:grid-cols-2 lg:grid-cols-4">
      <span>1 set = 4 pcs (M, L, XL, XXL) or 5 pcs with S</span>
      <span>MOQ {MOQ_SETS} sets per color</span>
      <span>{LEAD_DAYS} days estimate on all lines</span>
      <span>Sample set {inr(SAMPLE_SET_PRICE)} • Private label +{inr(PRIVATE_LABEL_PER_PC)}/pc</span>
    </div>

    {PRODUCTS.map((p) => (
      <div key={p.id} className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">{p.name}</h2>
          <p className="font-label text-[10px] uppercase tracking-[0.18em] text-foreground/55">{p.fabric}</p>
        </div>
        <div className="mt-3 overflow-x-auto border border-foreground/60">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-foreground/60 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                <th className="px-3 py-2.5">Color</th>
                <th className="px-3 py-2.5">10–29 sets</th>
                <th className="px-3 py-2.5">30–49 sets (−6%)</th>
                <th className="px-3 py-2.5">50+ sets (−12%)</th>
                <th className="px-3 py-2.5">MOQ</th>
                <th className="px-3 py-2.5">Lead</th>
              </tr>
            </thead>
            <tbody>
              {COLORS.map((c) => {
                const base = colorBase(p, c);
                return (
                  <tr key={c.name} className="border-b border-foreground/20 last:border-b-0">
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <span className="h-4 w-4 border border-foreground/50" style={{ backgroundColor: c.hex }} />
                        {c.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-label text-xs font-semibold">{inr(discountedSetBase(base, 10))}/set</td>
                    <td className="px-3 py-2.5 font-label text-xs font-semibold">{inr(discountedSetBase(base, 30))}/set</td>
                    <td className="px-3 py-2.5 font-label text-xs font-semibold">{inr(discountedSetBase(base, 50))}/set</td>
                    <td className="px-3 py-2.5 font-label text-xs">{MOQ_SETS} sets</td>
                    <td className="px-3 py-2.5 font-label text-xs">{LEAD_DAYS} days</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    ))}

    <PaymentTermsBox className="mt-10" />
    <p className="mt-4 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/50">
      Prices are per 4-pc set, ex-GST. GST invoice auto-generated on every confirmed order. Custom
      size ratios priced pro-rata per piece.
    </p>
  </div>
);

export default RateCardPage;
