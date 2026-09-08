import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Check, Search } from "lucide-react";
import { TwentyDaysBadge } from "@/components/Badges";
import { LEAD_DAYS, LEAD_LABEL } from "@/lib/pricing";
import { formatDate, trackOrder } from "@/lib/api";

/* What each production stage means to the retailer. Keyed by the status the
   API returns, which also fixes their order via the timeline it sends back. */
const STEP_INFO = {
  placed: { label: "Order Placed", note: "Cart confirmed and recorded" },
  payment_received: { label: "Payment Received", note: "100% advance confirmed on WhatsApp" },
  cutting: { label: "Cutting", note: "Fabric layered and cut set-wise" },
  stitching: { label: "Stitching", note: "Lines running colorwise" },
  qc: { label: "QC", note: "Piece-by-piece quality check" },
  dispatch: { label: "Dispatch", note: "Packed and handed to logistics" },
  delivered: { label: "Delivered", note: "Received at your address" },
};

const daysSince = (iso) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

const TrackingPage = () => {
  const [params, setParams] = useSearchParams();
  const urlCode = params.get("code") ?? "";
  const [code, setCode] = useState(urlCode);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = useCallback(async (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setBusy(true);
    setError("");
    try {
      setOrder(await trackOrder(trimmed));
    } catch (err) {
      setOrder(null);
      setError(
        err?.response?.status === 404
          ? "No order found with that code. Check the code on your WhatsApp confirmation."
          : "Could not reach tracking right now. Try again in a moment."
      );
    } finally {
      setBusy(false);
    }
  }, []);

  // The URL drives the lookup, so arriving with ?code= (the link from an order
  // in My Account) and changing it later both track, with no double fetch.
  useEffect(() => {
    if (!urlCode) return;
    setCode(urlCode);
    lookup(urlCode);
  }, [urlCode, lookup]);

  const onSubmit = (e) => {
    e.preventDefault();
    const next = code.trim().toUpperCase();

    // Re-submitting the same code leaves the URL untouched, so the effect will
    // not fire — refresh it here instead.
    if (next && next === urlCode) lookup(next);
    else setParams(next ? { code: next } : {});
  };

  const elapsed = order ? Math.min(daysSince(order.placed_at), LEAD_DAYS) : 0;

  return (
    <div className="relative">
      <Helmet>
        <title>Track Your Bulk Order — J.J. Serow Clothing Co.</title>
        <meta
          name="description"
          content={`Track your set-wise bulk order through payment, cutting, stitching, QC and dispatch — on a ${LEAD_LABEL} estimate.`}
        />
      </Helmet>
      <span className="vertical-label absolute left-1 top-24 hidden font-label text-[10px] uppercase tracking-[0.35em] text-foreground/40 lg:block">
        Tracking — {LEAD_LABEL}
      </span>

      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-8">
        <p className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground/60">
          Order tracking
        </p>
        <h1 className="mt-4 font-display text-5xl font-black tracking-tight">Where is my order?</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/70">
          Enter the order code from your WhatsApp confirmation. Production runs on a {LEAD_DAYS}-day estimate
          from payment confirmation.
        </p>

        <form onSubmit={onSubmit} className="mt-8 flex max-w-xl gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. JS-2041"
            className="h-12 flex-1 border border-foreground/60 bg-transparent px-4 font-label text-sm uppercase tracking-[0.14em] focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex h-12 items-center gap-2 bg-foreground px-5 font-label text-xs font-semibold uppercase tracking-[0.16em] text-background disabled:opacity-50"
          >
            <Search className="h-4 w-4" /> {busy ? "Checking…" : "Track"}
          </button>
        </form>

        {error && (
          <p className="mt-6 max-w-xl border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {order && (
          <div className="mt-12 border border-foreground bg-card p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-label text-[10px] uppercase tracking-[0.2em] text-foreground/55">
                  Order {order.code}
                </p>
                <p className="mt-1 font-display text-3xl font-black">{order.status_label}</p>
                <p className="mt-1 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                  Placed {formatDate(order.placed_at)} • Day {elapsed} of {LEAD_DAYS}
                </p>
              </div>
              <TwentyDaysBadge />
            </div>

            <div className="mt-6">
              <div className="h-3 w-full border border-foreground/60 bg-background">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${(elapsed / LEAD_DAYS) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                <span>Order placed</span>
                <span>Est. dispatch — {formatDate(order.expected_dispatch)}</span>
              </div>
            </div>

            {order.stage_index === null ? (
              <p className="mt-8 border-t border-foreground/40 pt-6 text-sm text-foreground/70">
                This order is no longer in production. Reach us on WhatsApp for details.
              </p>
            ) : (
              <div className="mt-8 border-t border-foreground/40">
                {order.timeline.map((status, i) => {
                  const info = STEP_INFO[status] ?? { label: status, note: "" };
                  const done = i < order.stage_index;
                  const current = i === order.stage_index;
                  return (
                    <div
                      key={status}
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
                        <p className="font-display text-lg font-bold">{info.label}</p>
                        <p className="font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                          {info.note}
                        </p>
                      </div>
                      <span className="font-label text-[10px] uppercase tracking-[0.14em] text-foreground/50">
                        {done ? "Done" : current ? "In progress" : "Queued"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

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
