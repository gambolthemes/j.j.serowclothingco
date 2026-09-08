import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Lock } from "lucide-react";
import Reveal from "@/components/Reveal";
import { TwentyDaysBadge, StockBadge } from "@/components/Badges";
import { PRODUCTS, COLORS, minBase } from "@/data/products";
import { inr, MOQ_SETS } from "@/lib/pricing";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TABS = [
  { key: "all", label: "All" },
  { key: "shirts", label: "Shirts" },
  { key: "tees", label: "Tees" },
];

const CatalogPage = () => {
  const { isAuthed } = useAuth();
  const [tab, setTab] = useState("all");
  const [color, setColor] = useState("all");

  const items = useMemo(
    () =>
      PRODUCTS.filter((p) => {
        if (tab !== "all" && p.category !== tab) return false;
        if (color !== "all" && p.stock[color] !== "in_stock") return false;
        return true;
      }),
    [tab, color]
  );

  return (
    <div className="relative">
      <Helmet>
        <title>Wholesale Catalog — J.J. Serow Clothing Co.</title>
        <meta
          name="description"
          content="Shirts and T-shirts in 5 colorways, sold bulk and set wise only. MOQ 10 sets per color, colorwise price and stock, 20 days estimate on every style."
        />
      </Helmet>
      <span className="vertical-label absolute left-1 top-24 hidden font-label text-[10px] uppercase tracking-[0.35em] text-foreground/40 lg:block">
        Catalog — Set wise only
      </span>

      <div className="mx-auto max-w-[90rem] px-4 py-14 sm:px-8">
        <Reveal>
          <p className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground/60">
            Bulk only • No single pieces
          </p>
          <h1 className="mt-4 font-display text-5xl font-black tracking-tight sm:text-6xl">
            The Catalog
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/70">
            Every style runs in White, Black, Stone, Charcoal and Bone — each color with its own
            price, MOQ and stock status. 1 set = 4 pcs (M, L, XL, XXL) or 5 pcs with S.
          </p>
        </Reveal>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-y border-foreground/60 py-4">
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`h-10 px-4 font-label text-[11px] uppercase tracking-[0.16em] transition-colors ${
                  tab === t.key
                    ? "bg-foreground text-background"
                    : "border border-foreground/50 hover:bg-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger className="h-10 w-[190px] rounded-none border-foreground/50 bg-transparent font-label text-[11px] uppercase tracking-[0.14em]">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="all">All colors</SelectItem>
              {COLORS.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name} — in stock
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="font-label text-[10px] uppercase tracking-[0.16em] text-foreground/50">
            {items.length} style{items.length === 1 ? "" : "s"}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="mt-16 border border-foreground/50 p-10 text-center">
            <p className="font-display text-2xl font-bold">Nothing in stock for that filter.</p>
            <p className="mt-2 text-sm text-foreground/60">
              Try another color — made-to-order colors still run on the 20-day estimate.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.06}>
                <Link to={`/product/${p.id}`} className="group block">
                  <div className="relative border border-foreground bg-card p-2 shadow-[6px_6px_0_0_hsl(var(--accent))] transition-transform group-hover:-translate-y-1">
                    <img src={p.image} alt={p.name} className="aspect-[3/4] w-full object-cover" />
                    <TwentyDaysBadge className="absolute left-4 top-4" />
                  </div>
                  <div className="mt-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-xl font-bold">{p.name}</h2>
                      {isAuthed ? (
                        <span className="whitespace-nowrap font-label text-xs font-semibold">
                          from {inr(minBase(p))}/set
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 whitespace-nowrap font-label text-[10px] uppercase tracking-[0.12em] text-foreground/55">
                          <Lock className="h-3 w-3" /> Login to see wholesale prices
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                      {p.fabric} • MOQ {MOQ_SETS} sets / color
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {COLORS.map((c) => (
                        <span
                          key={c.name}
                          title={`${c.name} — ${p.stock[c.name] === "in_stock" ? "In stock" : "Made to order"}`}
                          className="h-4 w-4 border border-foreground/50"
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                      <StockBadge stock={color !== "all" ? p.stock[color] : "in_stock"} />
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogPage;
