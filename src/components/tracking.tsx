"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Content } from "@/lib/content";
import { trackingPermissions } from "@/lib/consent";
import { Cookie } from "lucide-react";
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & {
      queue?: unknown[][];
      callMethod?: (...args: unknown[]) => void;
      push?: unknown;
      loaded?: boolean;
      version?: string;
    };
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[][] };
  }
}
const consentKey = "ads-tracking-consent-v2";
let memoryConsent: string | null = null;
function storedConsent() {
  try {
    return localStorage.getItem(consentKey) || memoryConsent;
  } catch {
    return memoryConsent;
  }
}
function clearTrackingCookies() {
  // Clear only optional first-party cookies, leaving auth and consent intact.
  const domains = location.hostname.split(".");
  for (const entry of document.cookie.split(";")) {
    const name = entry.trim().split("=")[0];
    if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_fbp$|_fbc$|_clck$|_clsk$)/.test(name))
      continue;
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (let i = 0; i < domains.length - 1; i++) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domains.slice(i).join(".")}`;
    }
  }
}
export function attribution() {
  try {
    if (
      typeof window === "undefined" ||
      !trackingPermissions(storedConsent()).analytics
    )
      return {};
    const params = new URLSearchParams(location.search);
    const saved = JSON.parse(sessionStorage.getItem("ads-attribution") || "{}");
    const fields = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ];
    for (const f of fields) {
      const value = params.get(f);
      if (value) saved[f] = value.slice(0, 200);
    }
    sessionStorage.setItem("ads-attribution", JSON.stringify(saved));
    return saved;
  } catch {
    return {};
  }
}
export function track(name: string, properties: Record<string, string> = {}) {
  if (
    typeof window === "undefined" ||
    !trackingPermissions(storedConsent()).analytics
  )
    return;
  window.gtag?.("event", name, properties);
  window.clarity?.("event", name);
  if (storedConsent() !== "accepted") return;
  if (name === "lead_submitted") window.fbq?.("track", "Lead");
  else if (name === "booking_submitted") window.fbq?.("track", "Schedule");
  else window.fbq?.("trackCustom", name, properties);
}
function script(src: string, id: string) {
  if (document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  el.async = true;
  el.src = src;
  document.head.appendChild(el);
}
export function Analytics({ config }: { config: Content["tracking"] }) {
  const [consent, setConsent] = useState<string | null>("loading");
  const [show, setShow] = useState(false);
  const path = usePathname();
  useEffect(() => {
    const value = storedConsent();
    setConsent(value);
    setShow(!value);
    const open = () => setShow(true);
    window.addEventListener("open-consent", open);
    return () => window.removeEventListener("open-consent", open);
  }, []);
  useEffect(() => {
    if (!["accepted", "analytics"].includes(consent || "")) return;
    attribution();
    if (config.ga4) {
      window.dataLayer = window.dataLayer || [];
      window.gtag =
        window.gtag ||
        function () {
          window.dataLayer.push(arguments);
        };
      window.gtag("consent", "default", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      window.gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: consent === "accepted" ? "granted" : "denied",
        ad_user_data: consent === "accepted" ? "granted" : "denied",
        ad_personalization: consent === "accepted" ? "granted" : "denied",
      });
      window.gtag("js", new Date());
      window.gtag("config", config.ga4, { send_page_view: false });
      script(
        `https://www.googletagmanager.com/gtag/js?id=${config.ga4}`,
        "ga4",
      );
    }
    if (consent === "accepted" && config.pixel && !window.fbq) {
      const fb: NonNullable<Window["fbq"]> = function (...args) {
        if (fb.callMethod) fb.callMethod(...args);
        else fb.queue!.push(args);
      };
      fb.queue = [];
      fb.loaded = true;
      fb.version = "2.0";
      fb.push = fb;
      window.fbq = fb;
      fb("init", config.pixel);
      script("https://connect.facebook.net/en_US/fbevents.js", "meta-pixel");
    }
    if (config.clarity && !window.clarity) {
      const cl: NonNullable<Window["clarity"]> = function (...args) {
        cl.q!.push(args);
      };
      cl.q = [];
      window.clarity = cl;
      cl("consentv2", {
        analytics_Storage: "granted",
        ad_Storage: consent === "accepted" ? "granted" : "denied",
      });
      script(`https://www.clarity.ms/tag/${config.clarity}`, "clarity");
    }
  }, [consent, config.ga4, config.pixel, config.clarity]);
  useEffect(() => {
    if (!["accepted", "analytics"].includes(consent || "")) return;
    window.gtag?.("event", "page_view", {
      page_path: path,
      page_location: location.origin + path,
    });
    if (consent === "accepted") window.fbq?.("track", "PageView");
  }, [consent, path, config.ga4, config.pixel]);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const anchor = (e.target as Element)?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (href.startsWith("/contact"))
        track("contact_cta_click", { destination: href.split("?")[0] });
      else if (href.startsWith("tel:")) track("phone_click");
      else if (href.startsWith("mailto:")) track("email_click");
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  function choose(value: string) {
    memoryConsent = value;
    try {
      localStorage.setItem(consentKey, value);
    } catch {
      /* Consent remains in memory for this visit. */
    }
    setShow(false);
    if (
      ["accepted", "analytics"].includes(consent || "") &&
      value !== consent
    ) {
      window.gtag?.("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      window.fbq?.("consent", "revoke");
      window.clarity?.("consentv2", {
        analytics_Storage: "denied",
        ad_Storage: "denied",
      });
      clearTrackingCookies();
      try {
        sessionStorage.removeItem("ads-attribution");
      } catch {}
      location.reload();
    } else setConsent(value);
  }
  return show ? (
    <aside className="consent" aria-label="Privacy preferences">
      <h3>
        <Cookie size={20} aria-hidden="true" /> Your cookie choices
      </h3>
      <p>
        Optional analytics help us understand visits and improve your experience
        using Google Analytics and Microsoft Clarity (including session
        insights). Marketing consent also enables Meta Pixel advertising
        measurement. Enquiries work either way.{" "}
        <a href="/privacy">Privacy policy</a>
      </p>
      <div className="button-row">
        <button className="button secondary" onClick={() => choose("rejected")}>
          Reject optional
        </button>
        <button
          className="button secondary"
          onClick={() => choose("analytics")}
        >
          Analytics only
        </button>
        <button className="button" onClick={() => choose("accepted")}>
          Accept all cookies
        </button>
      </div>
    </aside>
  ) : consent !== "loading" ? (
    <button
      type="button"
      className="cookie-preferences-trigger"
      aria-label="Manage cookie preferences"
      title="Cookie preferences"
      onClick={() => setShow(true)}
    >
      <Cookie size={21} aria-hidden="true" />
      <span>Cookies</span>
    </button>
  ) : null;
}
