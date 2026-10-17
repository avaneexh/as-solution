"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { attribution, track } from "./tracking";
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}
export function EnquiryForm({
  services,
  ready,
}: {
  services: string[];
  ready: boolean;
}) {
  const params = useSearchParams();
  const [type, setType] = useState(
    params.get("type") === "booking" ? "booking" : "enquiry",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [token, setToken] = useState("");
  const [requestId, setRequestId] = useState("");
  const mount = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  useEffect(() => setRequestId(crypto.randomUUID()), []);
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!key) return;
    let active = true;
    const init = () => {
      if (
        active &&
        window.turnstile &&
        mount.current &&
        widget.current === null
      )
        widget.current = window.turnstile.render(mount.current, {
          sitekey: key,
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
    };
    const existing = document.getElementById("turnstile-script");
    if (!existing) {
      const s = document.createElement("script");
      s.id = "turnstile-script";
      s.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = init;
      document.head.appendChild(s);
    }
    const interval = setInterval(init, 500);
    return () => {
      active = false;
      clearInterval(interval);
      if (widget.current) {
        window.turnstile?.remove(widget.current);
        widget.current = null;
      }
    };
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const preferred = form.get("preferred_at");
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          business: form.get("business"),
          service: form.get("service"),
          message: form.get("message"),
          website: form.get("website"),
          consent: form.get("consent") === "on",
          type,
          preferred_at: preferred
            ? new Date(String(preferred) + "+05:30").toISOString()
            : undefined,
          turnstile: token,
          attribution: attribution(),
          request_id: requestId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data.reference);
      track(type === "booking" ? "booking_submitted" : "lead_submitted", {
        service: String(form.get("service")),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please retry.",
      );
      if (widget.current) window.turnstile?.reset(widget.current);
      setToken("");
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className="form-card success-panel">
        <CheckCircle2 size={48} />
        <h2>You’re on our radar.</h2>
        <p>
          {type === "booking"
            ? "Your booking request is saved. Our team will contact you to confirm the time."
            : "Your enquiry is saved. Our team will be in touch."}
        </p>
        <p>
          Reference: <strong>{result.slice(0, 8).toUpperCase()}</strong>
        </p>
        <a className="button secondary" href="/portal">
          Go to client portal <ArrowUpRight size={17} />
        </a>
        <p className="muted">
          Requests submitted while signed in appear in your portal.
        </p>
      </div>
    );
  const preselected = params.get("service") || "";
  const options = [
    ...new Set([...services, ...(preselected ? [preselected] : [])]),
  ];
  return (
    <form className="form-card" onSubmit={submit} data-clarity-mask="true">
      <div className="form-tabs">
        <button
          type="button"
          aria-pressed={type === "enquiry"}
          onClick={() => setType("enquiry")}
        >
          Make an enquiry
        </button>
        <button
          type="button"
          aria-pressed={type === "booking"}
          onClick={() => setType("booking")}
        >
          Book a strategy call
        </button>
      </div>
      <h2>
        {type === "booking"
          ? "Let’s put a plan together."
          : "Tell us what’s next."}
      </h2>
      <p>Share a little about your business. We’ll take it from there.</p>
      {!ready && (
        <p className="form-status">
          Online submissions are not active yet. Please use WhatsApp or call our
          team.
        </p>
      )}
      <div className="fields">
        <label className="field">
          Your name *
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            placeholder="Your full name"
          />
        </label>
        <label className="field">
          Business name
          <input
            name="business"
            maxLength={160}
            autoComplete="organization"
            placeholder="Your brand or business"
          />
        </label>
        <label className="field">
          Email address *
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
            placeholder="you@business.com"
          />
        </label>
        <label className="field">
          Phone number *
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            minLength={10}
            maxLength={20}
            placeholder="+91"
          />
        </label>
        <label className="field wide">
          What can we help with? *
          <select name="service" required defaultValue={preselected}>
            <option value="" disabled>
              Select a service
            </option>
            {options.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {type === "booking" && (
          <label className="field wide">
            Preferred date & time (India Standard Time) *
            <input name="preferred_at" type="datetime-local" required />
            <small className="muted">
              At least 1 hour from now. Our team will confirm availability.
            </small>
          </label>
        )}
        <label className="field wide">
          A little about your goals *
          <textarea
            name="message"
            minLength={10}
            maxLength={5000}
            required
            placeholder="Tell us about your business and what you’d like to achieve."
          />
        </label>
      </div>
      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="checkbox-label">
        <input type="checkbox" name="consent" required />
        <span>
          I have read the <a href="/privacy">privacy policy</a> and{" "}
          <a href="/terms">terms of service</a>, and consent to being contacted
          about this request.
        </span>
      </label>
      <div ref={mount} />
      <button className="button" disabled={busy || !ready || !requestId}>
        {busy
          ? "Saving your request…"
          : type === "booking"
            ? "Request a strategy call"
            : "Send my enquiry"}
        <ArrowUpRight size={17} />
      </button>
      {error && (
        <p role="alert" className="form-status error-status">
          {error}
        </p>
      )}
      <p className="muted" style={{ fontSize: 11, marginTop: 17 }}>
        Want to track your request?{" "}
        <a className="text-link" href="/login">
          Sign in before submitting.
        </a>
      </p>
    </form>
  );
}
