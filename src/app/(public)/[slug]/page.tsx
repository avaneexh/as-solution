import { BrandMark } from "@/components/brand-mark";
import { pageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getPublicContent as getContent } from "@/lib/data";
import {
  Services,
  Packages,
  Portfolio,
  Testimonials,
  CTA,
  SectionTitle,
  FAQ,
} from "@/components/public-site";
const names: Record<string, string> = {
  about: "About us",
  services: "Our services",
  packages: "Packages",
  portfolio: "Our work",
  testimonials: "Client voices",
  privacy: "Privacy policy",
  terms: "Terms of service",
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await getContent();
  const descriptions: Record<string, string> = {
    about: c.about.description,
    services: c.sections.servicesIntro,
    portfolio: c.sections.portfolioIntro,
    packages:
      "Compare transparent social media management and Meta advertising packages from ADS Solutions. Ad spend is billed separately.",
    testimonials:
      "Discover how ADS Solutions approaches client partnerships, communication and business growth.",
    privacy:
      "How ADS Solutions handles enquiries, personal information, analytics and privacy choices.",
    terms:
      "Service terms, advertising spend, content responsibilities and booking conditions at ADS Solutions.",
  };
  return pageMetadata(
    c,
    `/${slug}`,
    `${names[slug] || "Page"} | ${c.brand.name}`,
    descriptions[slug] || c.seo.description,
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await getContent();
  if (!names[slug]) notFound();
  return (
    <>
      {!["privacy", "terms"].includes(slug) && (
        <h1 className="sr-only">{names[slug]}</h1>
      )}
      {slug === "about" ? (
        <>
          <section className="page-hero container">
            <SectionTitle
              tag="MEET YOUR GROWTH PARTNER"
              title={c.about.title}
              description={c.about.description}
            />
            {c.about.image && (
              <img
                className="about-image"
                src={c.about.image}
                alt={c.about.alt}
              />
            )}
            <div className="about-mission">
              <BrandMark className="giant-infinity" />
              <p>{c.about.mission}</p>
            </div>
          </section>
          <Testimonials content={c} />
        </>
      ) : slug === "services" ? (
        <Services content={c} full />
      ) : slug === "packages" ? (
        <>
          <Packages content={c} />
          <FAQ />
        </>
      ) : slug === "portfolio" ? (
        <Portfolio content={c} />
      ) : slug === "testimonials" ? (
        <Testimonials content={c} />
      ) : (
        <section className="container legal section">
          <span className="eyebrow">ADS SOLUTIONS</span>
          <h1>{names[slug]}</h1>
          <p className="muted">Last updated: {c.legal.updated}</p>
          {(slug === "privacy" ? c.legal.privacy : c.legal.terms).map(
            (section, index) => (
              <div key={index}>
                <h2>{section.title}</h2>
                <p style={{ whiteSpace: "pre-line" }}>{section.body}</p>
              </div>
            ),
          )}
          <h2>Contact ADS Solutions</h2>
          <p>
            <a href={`mailto:${c.brand.email}`}>{c.brand.email}</a> ·{" "}
            <a href={`tel:${c.brand.phone.replaceAll(" ", "")}`}>
              {c.brand.phone}
            </a>
          </p>
        </section>
      )}
      {!["privacy", "terms"].includes(slug) && <CTA content={c} />}
    </>
  );
}
