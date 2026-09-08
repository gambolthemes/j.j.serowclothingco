import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { ArrowLeft, FileDown, Lock } from "lucide-react";
import { TwentyDaysBadge, StockBadge } from "@/components/Badges";
import PaymentTermsBox from "@/components/PaymentTermsBox";
import { Checkbox } from "@/components/ui/checkbox";
import { COLORS, findProduct, colorBase } from "@/data/products";
import {
  LEAD_DAYS,
  MOQ_SETS,
  PRIVATE_LABEL_PER_PC,
  SAMPLE_SET_PRICE,
  TIERS,
  tierFor,
  discountedSetBase,
  piecesPerSet,
  perSetPrice,
  lineTotal,
  inr,
  ratioLabel,
} from "@/lib/pricing";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

const SIZES = ["S", "M", "L", "XL", "XXL"];

const ProductPage = () => {
  const { id } = useParams();
  const product = findProduct(id);
  const { isAuthed } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const [colorName, setColorName] = useState("White");
  const [ratio, setRatio] = useState({ S: 0, M: 1, L: 1, XL: 1, XXL: 1 });
  const [sets, setSets] = useState(MOQ_SETS);
  const [sample, setSample] = useState(false);
  const [privateLabel, setPrivateLabel] = useState(false);

  const color = COLORS.find((c) => c.name === colorName) || COLORS[0];
  const base = product ? colorBase(product, color) : 0;
  const pieces = piecesPerSet(ratio);
  const tier = tierFor(sets);
  const perSet = perSetPrice(base, sets, ratio, privateLabel);
  const total = lineTotal(base, { sets, ratio, sample, privateLabel });
  const valid = pieces > 0 && sets >= MOQ_SETS;

  const stock = useMemo(
    () => (product ? product.stock[colorName] : "made_to_order"),
    [product, colorName]
  );

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-black">Style not found</h1>
        <Link to="/catalog" className="mt-6 inline-block font-label text-xs uppercase tracking-[0.16em] underline underline-offset-4">
          Back to catalog
        </Link>
      </div>
    );
  }

  const setSize = (s, v) =>
    setRatio((r) => ({ ...r, [s]: Math.max(0, Math.min(9, Number(v) || 0)) }));

  const soldOut = stock === "out_of_stock";

  const onAdd = () => {
    if (!isAuthed) {
      navigate("/login");
      return;
    }
    if (!valid || soldOut) return;
    addItem({ productId: product.id, colorName, ratio, sets, sample, privateLabel });
    navigate("/cart");
  };

  return (
    <div className="relative">
      <Helmet>
        <title>{product.name} — Bulk & Set Wise | J.J. Serow Clothing Co.</title>
        <meta
          name="description"
          content={`${product.name} in 5 colorways. Set-wise wholesale only — MOQ ${MOQ_SETS} sets per color, tier pricing, ${LEAD_DAYS} days estimate, 100% advance.`}
        />
      </Helmet>
      <span className="vertical-label absolute left-1 top-24 hidden font-label text-[10px] uppercase tracking-[0.35em] text-foreground/40 lg:block">
        Product — {product.category}
      </span>

      <div className="mx-auto max-w-[90rem] px-4 py-10 sm:px-8">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 font-label text-[11px] uppercase tracking-[0.16em] text-foreground/60 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Catalog
        </Link>

        <div className="mt-8 grid gap-12 lg:grid-cols-12">
          {/* Image */}
          <div className="lg:col-span-5">
            <div className="relative border border-foreground bg-card p-2 shadow-[8px_8px_0_0_hsl(var(--accent))]">
              <img src={product.image} alt={product.name} className="aspect-[3/4] w-full object-cover" />
              <TwentyDaysBadge className="absolute left-4 top-4" />
            </div>
            <p className="mt-4 font-label text-[10px] uppercase tracking-[0.2em] text-foreground/50">
              {product.fabric} • 1 set = 4 pcs (M, L, XL, XXL) or 5 pcs with S
            </p>
            <PaymentTermsBox className="mt-6" />
          </div>

          {/* Builder */}
          <div className="lg:col-span-7">
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground/60">
              {product.category === "shirts" ? "Shirts" : "Tees"} — Bulk only
            </p>
            <h1 className="mt-3 font-display text-4xl font-black tracking-tight sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/70">{product.blurb}</p>

            {!isAuthed && (
              <Link
                to="/login"
                className="mt-6 flex items-center gap-3 border border-foreground bg-foreground p-4 text-background transition-opacity hover:opacity-90"
              >
                <Lock className="h-4 w-4 shrink-0" />
                <span className="font-label text-xs font-semibold uppercase tracking-[0.14em]">
                  Login to see wholesale prices and place a set-wise order
                </span>
              </Link>
            )}

            {/* Colorwise table */}
            <h2 className="mt-10 font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
              Colorwise — price, MOQ, lead time, stock
            </h2>
            <div className="mt-3 overflow-x-auto border border-foreground/60">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-foreground/60 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                    <th className="px-3 py-2.5">Color</th>
                    <th className="px-3 py-2.5">Price / Set</th>
                    <th className="px-3 py-2.5">MOQ</th>
                    <th className="px-3 py-2.5">Lead Time</th>
                    <th className="px-3 py-2.5">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {COLORS.map((c) => (
                    <tr
                      key={c.name}
                      onClick={() => setColorName(c.name)}
                      className={`cursor-pointer border-b border-foreground/20 last:border-b-0 transition-colors ${
                        colorName === c.name ? "bg-accent/40" : "hover:bg-secondary/60"
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <span
                            className="h-4 w-4 shrink-0 border border-foreground/50"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="font-medium">{c.name}</span>
                          {colorName === c.name && (
                            <span className="font-label text-[9px] uppercase tracking-[0.14em] text-foreground/50">
                              selected
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-label text-xs font-semibold">
                        {isAuthed ? (
                          `${inr(discountedSetBase(colorBase(product, c), sets))} / set`
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-foreground/40" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-label text-xs">{MOQ_SETS} sets</td>
                      <td className="px-3 py-2.5">
                        <TwentyDaysBadge />
                      </td>
                      <td className="px-3 py-2.5">
                        <StockBadge stock={product.stock[c.name]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Set builder */}
            <h2 className="mt-10 font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
              Custom set builder — {colorName}
            </h2>
            <div className="mt-3 border border-foreground/60 p-4 sm:p-5">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setRatio({ S: 0, M: 1, L: 1, XL: 1, XXL: 1 })}
                  className="h-9 border border-foreground/50 px-3 font-label text-[10px] uppercase tracking-[0.14em] hover:bg-secondary"
                >
                  4-pc set (M–XXL)
                </button>
                <button
                  onClick={() => setRatio({ S: 1, M: 1, L: 1, XL: 1, XXL: 1 })}
                  className="h-9 border border-foreground/50 px-3 font-label text-[10px] uppercase tracking-[0.14em] hover:bg-secondary"
                >
                  5-pc set (S–XXL)
                </button>
                <span className="flex h-9 items-center font-label text-[10px] uppercase tracking-[0.14em] text-foreground/50">
                  or set your own ratio
                </span>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
                {SIZES.map((s) => (
                  <label key={s} className="block">
                    <span className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.16em] text-foreground/60">
                      {s} / set
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="9"
                      value={ratio[s]}
                      onChange={(e) => setSize(s, e.target.value)}
                      className="h-11 w-full border border-foreground/60 bg-transparent text-center font-label text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <label className="block">
                  <span className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.16em] text-foreground/60">
                    Sets (MOQ {MOQ_SETS})
                  </span>
                  <input
                    type="number"
                    min={MOQ_SETS}
                    value={sets}
                    onChange={(e) => setSets(Math.max(1, Number(e.target.value) || 0))}
                    className="h-11 w-32 border border-foreground/60 bg-transparent px-3 font-label text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                  />
                </label>
                <span className="font-label text-[10px] uppercase tracking-[0.14em] text-foreground/50">
                  {pieces} pcs / set • {pieces * sets} pcs total
                </span>
              </div>
              {sets < MOQ_SETS && (
                <p className="mt-3 font-label text-[11px] uppercase tracking-[0.12em] text-destructive">
                  Minimum order is {MOQ_SETS} sets per color.
                </p>
              )}

              <div className="mt-5 flex flex-col gap-3 border-t border-foreground/30 pt-5">
                <label className="flex items-start gap-3">
                  <Checkbox checked={sample} onCheckedChange={(v) => setSample(v === true)} className="mt-0.5 rounded-none" />
                  <span className="text-sm">
                    Add 1 sample set for quality check — {inr(SAMPLE_SET_PRICE)}
                    <span className="block font-label text-[10px] uppercase tracking-[0.12em] text-foreground/50">
                      Ships ahead of the bulk run
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={privateLabel}
                    onCheckedChange={(v) => setPrivateLabel(v === true)}
                    className="mt-0.5 rounded-none"
                  />
                  <span className="text-sm">
                    Private label — your brand tags, +{inr(PRIVATE_LABEL_PER_PC)}/pc
                    <span className="block font-label text-[10px] uppercase tracking-[0.12em] text-foreground/50">
                      Woven label + wash care with your branding
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Tier pricing */}
            <div className="mt-6 grid grid-cols-3 gap-px border border-foreground/60 bg-foreground/60">
              {TIERS.map((t) => (
                <div
                  key={t.label}
                  className={`px-3 py-3 ${tier === t ? "bg-accent text-accent-foreground" : "bg-background"}`}
                >
                  <p className="font-label text-[9px] uppercase tracking-[0.14em] opacity-70">{t.label}</p>
                  <p className="mt-1 font-label text-sm font-semibold">
                    {isAuthed ? `${inr(discountedSetBase(base, t.min))}/set` : "—"}
                  </p>
                  {t.discount > 0 && (
                    <p className="font-label text-[9px] uppercase tracking-[0.12em] opacity-70">
                      {Math.round(t.discount * 100)}% off
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Summary + CTA */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-foreground bg-card p-4 sm:p-5">
              <div>
                {isAuthed ? (
                  <>
                    <p className="font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                      {sets} sets • {ratioLabel(ratio)} • {tier.label}
                      {sample ? " • +sample" : ""}
                      {privateLabel ? " • private label" : ""}
                    </p>
                    <p className="mt-1 font-display text-3xl font-black">
                      {inr(total)}
                      <span className="ml-2 font-label text-xs font-normal text-foreground/55">
                        {inr(perSet)} / set
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="flex items-center gap-2 font-label text-xs uppercase tracking-[0.14em] text-foreground/60">
                    <Lock className="h-4 w-4" /> Login to see wholesale prices
                  </p>
                )}
                <p className="mt-1 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/50">
                  + GST as applicable • GST invoice auto-generated
                </p>
                {soldOut && (
                  <p className="mt-2 font-label text-[10px] uppercase tracking-[0.14em] text-destructive">
                    {colorName} is out of stock — pick another colour
                  </p>
                )}
              </div>
              <button
                onClick={onAdd}
                disabled={isAuthed && (!valid || soldOut)}
                className="flex h-12 items-center gap-2 bg-foreground px-6 font-label text-xs font-semibold uppercase tracking-[0.16em] text-background transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {!isAuthed ? "Login to order" : soldOut ? "Out of stock" : "Add to bulk cart"}
              </button>
            </div>

            <Link
              to="/rate-card"
              className="mt-6 inline-flex items-center gap-2 font-label text-[11px] font-semibold uppercase tracking-[0.16em] underline underline-offset-4 hover:text-foreground/70"
            >
              <FileDown className="h-4 w-4" /> Download full rate card (PDF)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
