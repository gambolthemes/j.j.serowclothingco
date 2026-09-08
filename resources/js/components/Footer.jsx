import React from "react";
import { Link } from "react-router-dom";
import { LOGO_URL } from "@/data/products";
import { WHATSAPP_NUMBER } from "@/lib/pricing";

const Footer = () => (
  <footer className="border-t border-foreground bg-foreground text-background print:hidden">
    <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-14 sm:px-8 md:grid-cols-12">
      <div className="md:col-span-5">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="J.J. Serow goat head logo" className="h-12 w-12 border border-background/40 bg-background object-contain p-1" />
          <div className="leading-none">
            <p className="font-display text-2xl font-black tracking-tight">J.J. SEROW</p>
            <p className="mt-1 font-label text-[9px] uppercase tracking-[0.3em] text-background/60">Clothing Co.</p>
          </div>
        </div>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-background/70">
          Bulk. Set wise. Built to last. Shirts and T-shirts manufactured for retailers — no single
          pieces, no retail. Every order runs on a 20-day production estimate.
        </p>
      </div>
      <div className="md:col-span-3">
        <p className="font-label text-[10px] uppercase tracking-[0.25em] text-background/50">Navigate</p>
        <div className="mt-4 flex flex-col gap-2.5 text-sm">
          <Link to="/catalog" className="hover:text-accent">Catalog</Link>
          <Link to="/tracking" className="hover:text-accent">Track Order</Link>
          <Link to="/rate-card" className="hover:text-accent">Rate Card</Link>
          <Link to="/login" className="hover:text-accent">Client Login</Link>
        </div>
      </div>
      <div className="md:col-span-4">
        <p className="font-label text-[10px] uppercase tracking-[0.25em] text-background/50">Wholesale Desk</p>
        <div className="mt-4 flex flex-col gap-2.5 text-sm text-background/80">
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="hover:text-accent">
            WhatsApp: +91 98765 43210
          </a>
          <span>orders@jjserow.in</span>
          <span>Tirupur, Tamil Nadu, India</span>
          <span className="font-label text-[10px] uppercase tracking-[0.18em] text-background/50">
            100% advance • GST invoice on every order
          </span>
        </div>
      </div>
    </div>
    <div className="border-t border-background/20">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-4 py-5 font-label text-[10px] uppercase tracking-[0.2em] text-background/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} J.J. Serow Clothing Co.</span>
        <span>Bulk only • Set wise only • 20 days estimate</span>
      </div>
    </div>
  </footer>
);

export default Footer;
