import React from "react";
import { TriangleAlert } from "lucide-react";
import { LEAD_DAYS } from "@/lib/pricing";

const PaymentTermsBox = ({ className = "" }) => (
  <div className={`border border-foreground/70 bg-accent p-4 text-accent-foreground sm:p-5 ${className}`}>
    <div className="flex items-start gap-3">
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.25} />
      <div>
        <p className="font-label text-xs font-semibold uppercase tracking-[0.12em] sm:text-sm">
          100% Advance • Order confirmed only after payment • {LEAD_DAYS} Days Production
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          Share your payment receipt on WhatsApp — the order is confirmed within 6 hours and the
          {LEAD_DAYS}-day production clock starts at confirmation. A GST invoice is auto-generated for every
          confirmed order.
        </p>
      </div>
    </div>
  </div>
);

export default PaymentTermsBox;
