import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { LOGO_URL } from "@/data/products";
import { useAuth } from "@/contexts/AuthContext";

const SignupPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      await signup(email, password, { name, company });
      navigate("/catalog");
    } catch (err) {
      setError(err?.response?.data?.errors?.email?.[0] || "Could not create the account. Try a different email.");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "h-11 w-full border border-foreground/60 bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground";
  const label = "mb-2 block font-label text-[10px] uppercase tracking-[0.16em] text-foreground/60";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20">
      <Helmet>
        <title>Retailer Sign Up — J.J. Serow Clothing Co.</title>
        <meta name="description" content="Register your retail business for wholesale pricing and set-wise bulk ordering." />
      </Helmet>
      <img src={LOGO_URL} alt="J.J. Serow goat head logo" className="h-16 w-16 border border-foreground/60 object-cover" />
      <h1 className="mt-6 font-display text-4xl font-black tracking-tight">Retailer Sign Up</h1>
      <p className="mt-2 text-center font-label text-[10px] uppercase tracking-[0.2em] text-foreground/55">
        Unlock colorwise wholesale pricing
      </p>

      <form onSubmit={onSubmit} className="mt-8 w-full border border-foreground bg-card p-6">
        <label className="block">
          <span className={label}>Your name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Full name" />
        </label>
        <label className="mt-4 block">
          <span className={label}>Store / Company</span>
          <input required value={company} onChange={(e) => setCompany(e.target.value)} className={field} placeholder="e.g. Serow Retail, Kochi" />
        </label>
        <label className="mt-4 block">
          <span className={label}>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="buyer@yourstore.in" />
        </label>
        <label className="mt-4 block">
          <span className={label}>Password (min 10 characters)</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} placeholder="••••••••••" />
        </label>
        {error && (
          <p className="mt-4 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 flex h-12 w-full items-center justify-center bg-foreground font-label text-xs font-semibold uppercase tracking-[0.16em] text-background disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-foreground/70">
        Already registered?{" "}
        <Link to="/login" className="font-label text-xs font-semibold uppercase tracking-[0.14em] underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default SignupPage;
