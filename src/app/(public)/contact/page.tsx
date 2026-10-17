import { Suspense } from "react";
import { getPublicContent as getContent } from "@/lib/data";
import { configured } from "@/lib/supabase/server";
import { EnquiryForm } from "@/components/enquiry-form";
import { pageMetadata } from "@/lib/seo";
export async function generateMetadata() {
  const c = await getContent();
  return pageMetadata(
    c,
    "/contact",
    `Let’s talk | ${c.brand.name}`,
    "Book a free strategy call with ADS Solutions. Discuss social media, Meta advertising, creative content and your next growth opportunity.",
  );
}
export default async function Contact() {
  const c = await getContent();
  const ready =
    configured() &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    (process.env.NODE_ENV !== "production" ||
      Boolean(
        process.env.RATE_LIMIT_SALT &&
        process.env.REQUIRE_TURNSTILE === "true" &&
        process.env.TURNSTILE_SECRET_KEY &&
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
        process.env.NEXT_PUBLIC_SITE_URL,
      ));
  return (
    <div className="container contact-grid">
      <div className="contact-intro">
        <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
        <h1>
          A good conversation.
          <br />
          <span style={{ color: "var(--blue)" }}>A great beginning.</span>
        </h1>
        <p>
          Have a goal, an idea, or a challenge? We’d love to hear it. Let’s find
          your next growth opportunity.
        </p>
        <div className="contact-detail">
          <small>GIVE US A CALL</small>
          <a href={`tel:${c.brand.phone.replaceAll(" ", "")}`}>
            {c.brand.phone}
          </a>
        </div>
        <div className="contact-detail">
          <small>DROP US A LINE</small>
          <a href={`mailto:${c.brand.email}`}>{c.brand.email}</a>
        </div>
        <a
          className="button whatsapp"
          href={`https://wa.me/${c.brand.whatsapp}`}
          target="_blank"
          rel="noreferrer"
        >
          Prefer WhatsApp? Say hello ↗
        </a>
      </div>
      <Suspense fallback={<p>Loading enquiry form…</p>}>
        <EnquiryForm
          services={c.services.filter((s) => s.published).map((s) => s.title)}
          ready={ready}
        />
      </Suspense>
    </div>
  );
}
