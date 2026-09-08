import React from "react";
import { Clock } from "lucide-react";
import { LEAD_DAYS } from "@/lib/pricing";

export const TwentyDaysBadge = ({ className = "" }) => (
  <span
    className={`inline-flex items-center gap-1.5 bg-accent px-2 py-1 font-label text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-foreground ${className}`}
  >
    <Clock className="h-3 w-3" strokeWidth={2.5} />
    {LEAD_DAYS} Days Estimate
  </span>
);

/* Three states, not two. An out-of-stock colourway used to fall through to the
   made-to-order branch, which told retailers they could have it in 20 days. */
export const StockBadge = ({ stock }) => {
  if (stock === "in_stock") {
    return (
      <span className="inline-block bg-foreground px-2 py-1 font-label text-[10px] uppercase tracking-[0.12em] text-background">
        In Stock
      </span>
    );
  }

  if (stock === "out_of_stock") {
    return (
      <span className="inline-block border border-destructive/60 bg-destructive/10 px-2 py-1 font-label text-[10px] uppercase tracking-[0.12em] text-destructive">
        Out of Stock
      </span>
    );
  }

  return (
    <span className="inline-block border border-foreground/50 px-2 py-1 font-label text-[10px] uppercase tracking-[0.12em]">
      Made to Order • {LEAD_DAYS} Days
    </span>
  );
};
