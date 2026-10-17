import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) return [];
  return [
    "",
    "/about",
    "/services",
    "/portfolio",
    "/packages",
    "/testimonials",
    "/contact",
    "/privacy",
    "/terms",
  ].map((p) => ({
    url: url + p,
    changeFrequency: "monthly" as const,
    priority: p ? 0.7 : 1,
  }));
}
