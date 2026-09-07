import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, ShoppingBag, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { LOGO_URL } from "@/data/products";

const NAV = [
  { to: "/catalog", label: "Catalog" },
  { to: "/tracking", label: "Track Order" },
  { to: "/rate-card", label: "Rate Card" },
];

const Header = () => {
  const { isAuthed, user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navClass = ({ isActive }) =>
    `font-label text-[11px] uppercase tracking-[0.18em] transition-colors hover:text-foreground ${
      isActive ? "text-foreground underline underline-offset-4" : "text-foreground/60"
    }`;

  return (
    <header className="sticky top-0 z-50 print:hidden">
      <div className="flex items-center justify-between bg-foreground px-4 py-1.5 font-label text-[9px] uppercase tracking-[0.22em] text-background sm:px-8 sm:text-[10px]">
        <span>Bulk only • Set wise only • MOQ 10 sets / color</span>
        <span className="hidden sm:inline">20 days estimate on every order</span>
      </div>
      <div className="border-b border-foreground/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src={LOGO_URL} alt="J.J. Serow goat head logo" className="h-10 w-10 border border-foreground/60 object-cover" />
            <span className="leading-none">
              <span className="block font-display text-xl font-black tracking-tight">J.J. SEROW</span>
              <span className="mt-1 block font-label text-[9px] uppercase tracking-[0.3em] text-foreground/60">
                Clothing Co.
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={navClass}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/cart"
              className="relative flex h-10 items-center gap-2 border border-foreground/60 px-3 font-label text-[11px] uppercase tracking-[0.14em] transition-colors hover:bg-secondary"
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">Cart</span>
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center bg-accent px-1 font-label text-[10px] font-semibold text-accent-foreground">
                  {count}
                </span>
              )}
            </Link>
            {isAuthed ? (
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="hidden h-10 items-center gap-2 bg-foreground px-3 font-label text-[11px] uppercase tracking-[0.14em] text-background transition-opacity hover:opacity-85 sm:flex"
                title="Log out"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
                {user?.name ? user.name.split(" ")[0] : "Account"}
              </button>
            ) : (
              <Link
                to="/login"
                className="hidden h-10 items-center bg-foreground px-4 font-label text-[11px] uppercase tracking-[0.14em] text-background transition-opacity hover:opacity-85 sm:flex"
              >
                Client Login
              </Link>
            )}
            <button
              className="flex h-10 w-10 items-center justify-center border border-foreground/60 md:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-foreground/30 bg-background px-4 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={navClass} onClick={() => setOpen(false)}>
                  {n.label}
                </NavLink>
              ))}
              {isAuthed ? (
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                    navigate("/");
                  }}
                  className="text-left font-label text-[11px] uppercase tracking-[0.18em] text-foreground/60"
                >
                  Log out
                </button>
              ) : (
                <NavLink to="/login" className={navClass} onClick={() => setOpen(false)}>
                  Client Login
                </NavLink>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
