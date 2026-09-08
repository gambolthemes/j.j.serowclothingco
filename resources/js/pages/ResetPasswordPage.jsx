import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { LOGO_URL } from "@/data/products";
import { resetPassword, fieldErrors, generalError } from "@/lib/api";

/* Step two. The token and address come straight out of the mailed link and are
   only ever passed back — the server is what decides whether the pair is still
   good, so this page does not try to validate them itself. */
const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const email = params.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const notice = await resetPassword({ token, email, password });
      // Sign-in is deliberately a separate step: holding the link proves the
      // inbox, not the device. The login screen picks this notice up.
      navigate("/login", { replace: true, state: { notice } });
    } catch (err) {
      const errors = fieldErrors(err);
      setError(
        errors.password ||
          errors.email ||
          generalError(err, "That reset link is no longer valid. Ask for a new one.")
      );
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
        <title>Choose a New Password — J.J. Serow Clothing Co.</title>
        <meta name="description" content="Set a new password for your J.J. Serow retailer account." />
      </Helmet>
      <img src={LOGO_URL} alt="J.J. Serow goat head logo" className="h-16 w-16 border border-foreground/60 object-contain p-1" />
      <h1 className="mt-6 font-display text-4xl font-black tracking-tight">New Password</h1>
      <p className="mt-2 text-center font-label text-[10px] uppercase tracking-[0.2em] text-foreground/55">
        {email || "For your retailer account"}
      </p>

      {token && email ? (
        <form onSubmit={onSubmit} className="mt-8 w-full border border-foreground bg-card p-6">
          <label className="block">
            <span className={label}>New password (min 10 characters)</span>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
              placeholder="••••••••••"
            />
          </label>
          <label className="mt-4 block">
            <span className={label}>Confirm new password</span>
            <input
              type="password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className={field}
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
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      ) : (
        /* Someone typed the URL, or a mail client mangled the query string. */
        <div className="mt-8 w-full border border-foreground bg-card p-6">
          <p className="text-sm text-foreground/80">
            This page needs the link from your reset email — open it there, or ask for a fresh one.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 flex h-12 w-full items-center justify-center bg-foreground font-label text-xs font-semibold uppercase tracking-[0.16em] text-background"
          >
            Send a new link
          </Link>
        </div>
      )}

      <p className="mt-6 text-sm text-foreground/70">
        <Link to="/login" className="font-label text-xs font-semibold uppercase tracking-[0.14em] underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </div>
  );
};

export default ResetPasswordPage;
