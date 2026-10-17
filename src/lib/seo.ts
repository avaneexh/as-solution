import type { Metadata } from "next";
import type { Content } from "./content";
export function siteOrigin() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || "");
    return ["https:", "http:"].includes(url.protocol) ? url.origin : undefined;
  } catch {
    return undefined;
  }
}
export function pageMetadata(
  c: Content,
  path: string,
  title: string,
  description: string,
): Metadata {
  const origin = siteOrigin();
  const url = origin ? `${origin}${path}` : undefined;
  return {
    title: { absolute: title },
    description,
    ...(origin
      ? { metadataBase: new URL(origin), alternates: { canonical: url } }
      : {}),
    openGraph: {
      title,
      description,
      type: "website",
      locale: "en_IN",
      siteName: c.brand.name,
      ...(url ? { url } : {}),
    },
    twitter: { card: "summary", title, description },
  };
}
export function businessSchema(c: Content) {
  const origin = siteOrigin();
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: c.brand.name,
    description: c.seo.description,
    ...(origin
      ? {
          url: origin,
          logo: c.brand.logo ? new URL(c.brand.logo, origin).href : undefined,
        }
      : {}),
    telephone: c.brand.phone,
    email: c.brand.email,
    sameAs: [c.brand.instagram, c.brand.facebook].filter(Boolean),
  }).replace(/</g, "\\u003c");
}
