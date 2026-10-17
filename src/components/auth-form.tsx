"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import { safeNext } from "@/lib/validation";
export function AuthForm({ ready }: { ready: boolean }) {
  const params = useSearchParams();
  const destination = safeNext(params.get("next"));
  const admin = destination === "/admin";
  const [mode, setMode] = useState(
    params.get("reset") === "1" ? "update" : "login",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    params.get("error") === "confirmation"
      ? "This email link is expired or invalid. Sign in if your email is already confirmed, or request a new password reset link."
      : "",
  );
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const db = browserClient();
      const f = new FormData(e.currentTarget);
      const email = String(f.get("email") || "");
      const password = String(f.get("password") || "");
      if (mode === "signup") {
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: {
            data: { name: f.get("name") },
            emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(destination);
          router.refresh();
          return;
        }
        setMessage("Check your email to confirm your account. Then sign in.");
      } else if (mode === "reset") {
        const { error } = await db.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(`/login?reset=1&next=${encodeURIComponent(destination)}`)}`,
        });
        if (error) throw error;
        setMessage(
          "If an account exists, a password reset link has been sent.",
        );
      } else if (mode === "update") {
        const { error } = await db.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Password updated.");
        router.replace(destination);
        router.refresh();
      } else {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(destination);
        router.refresh();
      }
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to sign in. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-card" onSubmit={submit}>
      <span className="eyebrow">
        {admin ? "ADS SOLUTIONS · ADMIN" : "YOUR GROWTH, IN ONE PLACE"}
      </span>
      <h2 style={{ marginTop: 13 }}>
        {mode === "signup"
          ? "Let’s get you started."
          : mode === "reset"
            ? "Reset your password."
            : mode === "update"
              ? "Choose a new password."
              : admin
                ? "Admin sign in."
                : "Welcome back."}
      </h2>
      <p>
        {mode === "login"
          ? admin
            ? "Sign in with your authorised administrator account."
            : "Sign in to track your enquiries and bookings."
          : "Use your business email to manage your account."}
      </p>
      {!ready && (
        <p className="form-status">
          Account setup is not complete yet. Supabase and the application
          database must be ready before sign in, account creation and password
          recovery are available.
        </p>
      )}
      <div className="fields">
        {mode === "signup" && (
          <label className="field">
            Full name
            <input name="name" required maxLength={100} autoComplete="name" />
          </label>
        )}
        {mode !== "update" && (
          <label className="field">
            Email address
            <input name="email" type="email" required autoComplete="email" />
          </label>
        )}
        {mode !== "reset" && (
          <label className="field">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            {mode !== "login" && (
              <small className="muted">Use at least 12 characters.</small>
            )}
          </label>
        )}
      </div>
      <button
        className="button"
        style={{ width: "100%", marginTop: 23 }}
        disabled={busy || !ready}
      >
        {busy
          ? "Please wait…"
          : mode === "signup"
            ? "Create account"
            : mode === "reset"
              ? "Send reset link"
              : mode === "update"
                ? "Save password"
                : "Sign in →"}
      </button>
      {message && (
        <p className="form-status" role="status">
          {message}
        </p>
      )}
      <div className="auth-links">
        {mode !== "login" && (
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
          >
            Back to sign in
          </button>
        )}
        {mode === "login" && (
          <>
            {!admin && (
              <button type="button" onClick={() => setMode("signup")}>
                Create an account
              </button>
            )}
            <button type="button" onClick={() => setMode("reset")}>
              Forgot password?
            </button>
          </>
        )}
        <a href="/">Back to website</a>
      </div>
      <p style={{ fontSize: 10, marginTop: 22 }}>
        Admin access is assigned by the account owner. Public sign-up creates a
        client account only.
      </p>
    </form>
  );
}
