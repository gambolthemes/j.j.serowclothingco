import React from "react";
import { MessageCircle } from "lucide-react";
import { WHATSAPP_NUMBER } from "@/lib/pricing";

const WhatsAppFloat = () => (
  <a
    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      "Hi J.J. Serow, I want to place a bulk set-wise order."
    )}`}
    target="_blank"
    rel="noreferrer"
    className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 border border-foreground bg-accent px-4 font-label text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-transform hover:-translate-y-0.5 active:translate-y-0 sm:bottom-8 sm:right-8 print:hidden"
    aria-label="WhatsApp bulk inquiry"
  >
    <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
    <span className="hidden sm:inline">Bulk Inquiry</span>
  </a>
);

export default WhatsAppFloat;
