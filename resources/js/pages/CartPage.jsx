import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Lock, Trash2, MessageCircle } from "lucide-react";
import { TwentyDaysBadge } from "@/components/Badges";
import PaymentTermsBox from "@/components/PaymentTermsBox";
import { COLORS, findProduct, colorBase } from "@/data/products";
import {
  GST_LABEL,
  GST_RATE,
  LEAD_LABEL,
  MOQ_SETS,
  WHATSAPP_NUMBER,
  perSetPrice,
  lineTotal,
  inr,
  ratioLabel,
  tierFor,
} from "@/lib/pricing";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { generalError, listAddresses, placeOrder } from "@/lib/api";

const CartPage = () => {
  const { isAuthed } = useAuth();
  const { items, updateSets, removeItem, clear, syncing } = useCart();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthed) return;
    listAddresses()
      .then((list) => {
        setAddresses(list);
        setAddressId(String(list.find((a) => a.is_default)?.id ?? list[0]?.id ?? ""));
      })
      .catch(() => setAddresses([]));
  }, [isAuthed]);

  const detailed = items
    .map((item) => {
      const product = findProduct(item.productId);
      const color = COLORS.find((c) => c.name === item.colorName);
      if (!product || !color) return null;
      const base = colorBase(product, color);
      return {
        item,
        product,
        base,
        perSet: perSetPrice(base, item.sets, item.ratio, item.privateLabel),
        total: lineTotal(base, item),
      };
    })
    .filter(Boolean);

  const subtotal = detailed.reduce((a, d) => a + d.total, 0);
  const gst = Math.round(subtotal * GST_RATE);

  /**
   * Records the order first so the code quoted on WhatsApp resolves to something
   * real, then hands off. The tab is opened before the await — a popup opened
   * after one is no longer tied to the click and gets blocked.
   */
  const confirmOnWhatsApp = async () => {
    if (placing) return;
    setError("");
    setPlacing(true);

    const tab = window.open("", "_blank");

    try {
      const order = await placeOrder({
        address_id: addressId ? Number(addressId) : null,
        items: detailed.map((d) => ({
          product_id: String(d.item.productId),
          product_name: d.product.name,
          color_name: d.item.colorName,
          ratio: d.item.ratio,
          sets: d.item.sets,
          private_label: Boolean(d.item.privateLabel),
          sample: Boolean(d.item.sample),
          per_set_price: d.perSet,
          line_total: d.total,
        })),
      });

      const lines = detailed.map(
        (d) =>
          `• ${d.product.name} / ${d.item.colorName} — ${d.item.sets} sets (${ratioLabel(d.item.ratio)})` +
          `${d.item.sample ? " + sample set" : ""}${d.item.privateLabel ? " + private label" : ""} — ${inr(d.total)}`
      );
      const message = encodeURIComponent(
        [
          `J.J. SEROW — BULK ORDER ${order.code}`,
          ...lines,
          `Subtotal: ${inr(order.subtotal)}`,
          `${GST_LABEL}: ${inr(order.gst)}`,
          `Total: ${inr(order.total)}`,
          `Terms: 100% advance • ${LEAD_LABEL} estimate`,
        ].join("\n")
      );

      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
      if (tab) tab.location.href = url;
      else window.location.href = url;

      clear();
      navigate(`/account/orders/${order.code}`);
    } catch (err) {
      tab?.close();
      setError(generalError(err, "Could not record your order. Nothing was sent — try again."));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="relative">
      <Helmet>
        <title>Bulk Cart — J.J. Serow Clothing Co.</title>
        <meta
          name="description"
          content={`Your set-wise bulk order. 100% advance payment, order confirmed on WhatsApp within 6 hours, ${LEAD_LABEL} production estimate.`}
        />
      </Helmet>
      <span className="vertical-label absolute left-1 top-24 hidden font-label text-[10px] uppercase tracking-[0.35em] text-foreground/40 lg:block">
        Cart — 100% advance
      </span>

      <div className="mx-auto max-w-[90rem] px-4 py-14 sm:px-8">
        <h1 className="font-display text-5xl font-black tracking-tight">Bulk Cart</h1>
        <p className="mt-3 max-w-xl text-sm text-foreground/70">
          Set-wise lines only. Tier pricing recalculates automatically as you change set quantities.
        </p>

        {!isAuthed ? (
          <div className="mt-10 flex max-w-xl flex-col items-start gap-4 border border-foreground bg-card p-8">
            <Lock className="h-6 w-6" />
            <p className="font-display text-2xl font-bold">Login to see wholesale prices</p>
            <p className="text-sm text-foreground/70">
              The bulk cart, tier pricing and checkout are reserved for registered retailers.
            </p>
            <Link
              to="/login"
              className="flex h-12 items-center bg-foreground px-6 font-label text-xs font-semibold uppercase tracking-[0.16em] text-background"
            >
              Client Login
            </Link>
          </div>
        ) : detailed.length === 0 ? (
          <div className="mt-10 max-w-xl border border-foreground/50 p-10 text-center">
            <p className="font-display text-2xl font-bold">Your cart is empty.</p>
            <p className="mt-2 text-sm text-foreground/60">
              Build your first set-wise order from the catalog — MOQ {MOQ_SETS} sets per color.
            </p>
            <Link
              to="/catalog"
              className="mt-6 inline-flex h-12 items-center bg-foreground px-6 font-label text-xs font-semibold uppercase tracking-[0.16em] text-background"
            >
              Browse catalog
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="border-y border-foreground/60">
                {detailed.map((d) => (
                  <div
                    key={d.item.key}
                    className="grid grid-cols-[72px_1fr] gap-4 border-b border-foreground/25 py-5 last:border-b-0 sm:grid-cols-[96px_1fr_auto]"
                  >
                    <img
                      src={d.product.image}
                      alt={d.product.name}
                      className="h-24 w-18 w-full border border-foreground/50 object-cover sm:h-28"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-lg font-bold">{d.product.name}</h2>
                        <TwentyDaysBadge />
                      </div>
                      <p className="mt-1 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                        {d.item.colorName} • {ratioLabel(d.item.ratio)} • {tierFor(d.item.sets).label}
                        {d.item.sample ? " • +sample set" : ""}
                        {d.item.privateLabel ? " • private label" : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/60">
                          Sets
                          <input
                            type="number"
                            min={MOQ_SETS}
                            value={d.item.sets}
                            onChange={(e) =>
                              updateSets(d.item.key, Math.max(MOQ_SETS, Number(e.target.value) || MOQ_SETS))
                            }
                            className="h-9 w-20 border border-foreground/60 bg-transparent px-2 font-label text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                          />
                        </label>
                        <button
                          onClick={() => removeItem(d.item.key)}
                          className="flex h-9 items-center gap-1.5 border border-foreground/40 px-3 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/60 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2 text-left sm:col-span-1 sm:text-right">
                      <p className="font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                        {inr(d.perSet)} / set
                      </p>
                      <p className="mt-1 font-display text-2xl font-black">{inr(d.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="border border-foreground bg-card p-5">
                <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                  Order summary
                </h2>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/70">Subtotal</span>
                    <span className="font-label font-semibold">{inr(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/70">{GST_LABEL}</span>
                    <span className="font-label font-semibold">{inr(gst)}</span>
                  </div>
                  <div className="flex justify-between border-t border-foreground/40 pt-3">
                    <span className="font-medium">Total</span>
                    <span className="font-display text-2xl font-black">{inr(subtotal + gst)}</span>
                  </div>
                </div>
                <div className="mt-5 border-t border-foreground/25 pt-4">
                  <p className="font-label text-[10px] uppercase tracking-[0.16em] text-foreground/60">
                    Ship to
                  </p>
                  {addresses.length > 0 ? (
                    <select
                      value={addressId}
                      onChange={(e) => setAddressId(e.target.value)}
                      className="mt-2 h-11 w-full border border-foreground/60 bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label} — {a.city}, {a.state} {a.pincode}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-2 text-sm text-foreground/60">
                      No address saved.{" "}
                      <Link to="/account/addresses" className="underline underline-offset-4">
                        Add one
                      </Link>{" "}
                      so dispatch knows where this goes.
                    </p>
                  )}
                </div>

                <p className="mt-4 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/50">
                  GST invoice auto-generated on confirmation
                </p>
                <p className="mt-1 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/40">
                  {syncing ? "Loading your saved cart…" : "Saved to your account — opens on any device"}
                </p>
                <button
                  onClick={confirmOnWhatsApp}
                  disabled={placing}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-foreground font-label text-xs font-semibold uppercase tracking-[0.16em] text-background transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <MessageCircle className="h-4 w-4" />
                  {placing ? "Recording order…" : "Confirm order on WhatsApp"}
                </button>
                {error && (
                  <p className="mt-3 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <PaymentTermsBox className="mt-5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
