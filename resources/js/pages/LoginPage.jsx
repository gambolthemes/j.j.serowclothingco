import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { LOGO_URL } from "@/data/products";
import { useAuth } from "@/contexts/AuthContext";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/catalog");
    } catch {
      setError("Invalid email or password. New retailer? Create an account below.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20">
      <Helmet>
        <title>Client Login — J.J. Serow Clothing Co.</title>
        <meta name="description" content="Retailer login for wholesale pricing, set-wise ordering and order tracking." />
      </Helmet>
      <img src={LOGO_URL} alt="J.J. Serow goat head logo" className="h-16 w-16 border border-foreground/60 object-cover" />
      <h1 className="mt-6 font-display text-4xl font-black tracking-tight">Client Login</h1>
      <p className="mt-2 text-center font-label text-[10px] uppercase tracking-[0.2em] text-foreground/55">
        Wholesale prices are for registered retailers
      </p>

      <form onSubmit={onSubmit} className="mt-8 w-full border border-foreground bg-card p-6">
        <label className="block">
          <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.16em] text-foreground/60">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full border border-foreground/60 bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            placeholder="buyer@yourstore.in"
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.16em] text-foreground/60">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full border border-foreground/60 bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            placeholder="••••••••••"
          />
        </label>
        {error && (
          <p className="mt-4 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 flex h-12 w-full items-center justify-center bg-foreground font-label text-xs font-semibold uppercase tracking-[0.16em] text-background disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-foreground/70">
        New retailer?{" "}
        <Link to="/signup" className="font-label text-xs font-semibold uppercase tracking-[0.14em] underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
