import React from "react";
import { Clock } from "lucide-react";

export const TwentyDaysBadge = ({ className = "" }) => (
  <span
    className={`inline-flex items-center gap-1.5 bg-accent px-2 py-1 font-label text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-foreground ${className}`}
  >
    <Clock className="h-3 w-3" strokeWidth={2.5} />
    20 Days Estimate
  </span>
);

export const StockBadge = ({ stock }) =>
  stock === "in_stock" ? (
    <span className="inline-block bg-foreground px-2 py-1 font-label text-[10px] uppercase tracking-[0.12em] text-background">
      In Stock
    </span>
  ) : (
    <span className="inline-block border border-foreground/50 px-2 py-1 font-label text-[10px] uppercase tracking-[0.12em]">
      Made to Order • 20 Days
    </span>
  );
