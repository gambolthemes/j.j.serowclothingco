import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { LOGO_URL } from "@/data/products";
import { requestPasswordReset, fieldErrors, generalError } from "@/lib/api";

/* Step one of the reset. The server answers the same way for an address it
   knows and one it does not, so this screen shows the confirmation without
   claiming an account exists — saying "no such retailer" here would let anyone
   test which of their competitors buy from us. */
const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      setSent(await requestPasswordReset(email));
    } catch (err) {
      setError(
        fieldErrors(err).email ||
          generalError(err, "Could not send the link. Try again in a moment.")
      );
    } finally {
      setBusy(false);
    }
  };

  const field =
    "h-11 w-full border border-foreground/60 bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20">
      <Helmet>
        <title>Reset Password — J.J. Serow Clothing Co.</title>
        <meta name="description" content="Send yourself a link to set a new password for your J.J. Serow retailer account." />
      </Helmet>
      <img src={LOGO_URL} alt="J.J. Serow goat head logo" className="h-16 w-16 border border-foreground/60 object-contain p-1" />
      <h1 className="mt-6 font-display text-4xl font-black tracking-tight">Reset Password</h1>
      <p className="mt-2 text-center font-label text-[10px] uppercase tracking-[0.2em] text-foreground/55">
        We will mail you a link to set a new one
      </p>

      {sent ? (
        <div className="mt-8 w-full border border-foreground bg-card p-6">
          <p className="text-sm text-foreground/80">{sent}</p>
          <p className="mt-4 text-sm text-foreground/60">
            Nothing in your inbox after a few minutes? Check the spam folder, or message the
            wholesale desk on WhatsApp.
          </p>
          <Link
            to="/login"
            className="mt-6 flex h-12 w-full items-center justify-center bg-foreground font-label text-xs font-semibold uppercase tracking-[0.16em] text-background"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 w-full border border-foreground bg-card p-6">
          <label className="block">
            <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.16em] text-foreground/60">
              Account email
            </span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
              placeholder="buyer@yourstore.in"
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
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-foreground/70">
        Remembered it?{" "}
        <Link to="/login" className="font-label text-xs font-semibold uppercase tracking-[0.14em] underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default ForgotPasswordPage;
