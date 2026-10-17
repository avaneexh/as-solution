import { z } from "zod";
import { defaultLegal } from "./legal-content";
const text = z.string().max(10000);
export const mediaUrl = z
  .string()
  .max(2000)
  .refine(
    (v) => !v || /^\/(?!\/)/.test(v) || /^https:\/\//.test(v),
    "Use an https URL or a local /path",
  );
const item = z.object({
  id: z.string().min(1).max(80),
  title: text,
  description: text,
  image: mediaUrl,
  alt: text,
  published: z.boolean(),
});
export const contentSchema = z.object({
  brand: z.object({
    name: text,
    tagline: text,
    logo: mediaUrl,
    phone: z.string().regex(/^\+?[0-9 ]{10,18}$/),
    secondaryPhone: z
      .string()
      .regex(/^(\+?[0-9 ]{10,18})?$/)
      .default(""),
    proprietor: text.default(""),
    whatsapp: z.string().regex(/^\d{10,15}$/),
    email: z.email(),
    address: text,
    gstin: text,
    udyam: text,
    instagram: mediaUrl,
    facebook: mediaUrl,
  }),
  hero: z.object({
    eyebrow: text,
    title: text,
    highlight: text,
    description: text,
    image: mediaUrl,
    alt: text,
    cta: text,
  }),
  about: z.object({
    title: text,
    description: text,
    mission: text,
    image: mediaUrl,
    alt: text,
  }),
  sections: z.object({
    servicesTitle: text,
    servicesIntro: text,
    portfolioTitle: text,
    portfolioIntro: text,
    packagesTitle: text,
    testimonialsTitle: text,
    ctaTitle: text,
    ctaDescription: text,
  }),
  services: z
    .array(
      item.extend({
        icon: z.enum([
          "social",
          "ads",
          "video",
          "leads",
          "brand",
          "web",
          "person",
          "consult",
        ]),
      }),
    )
    .max(30),
  packages: z
    .array(
      z.object({
        id: text,
        name: text,
        subtitle: text,
        price: z.number().int().min(0),
        category: z.enum(["social", "ads"]),
        popular: z.boolean(),
        features: z.array(text).max(20),
        published: z.boolean(),
      }),
    )
    .max(20),
  portfolio: z
    .array(item.extend({ category: text, metric: text, video: mediaUrl }))
    .max(100),
  testimonials: z
    .array(
      z.object({
        id: text,
        name: text,
        role: text,
        quote: text,
        image: mediaUrl,
        alt: text,
        published: z.boolean(),
      }),
    )
    .max(100),
  process: z.array(z.object({ title: text, description: text })).max(10),
  seo: z.object({ title: text, description: text }),
  legal: z
    .object({
      updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      privacy: z
        .array(z.object({ title: text, body: text }))
        .min(1)
        .max(30),
      terms: z
        .array(z.object({ title: text, body: text }))
        .min(1)
        .max(30),
    })
    .default(defaultLegal),
  tracking: z.object({
    ga4: z.string().regex(/^(G-[A-Z0-9]+)?$/),
    pixel: z.string().regex(/^\d*$/),
    clarity: z.string().regex(/^[a-zA-Z0-9]*$/),
  }),
});
export type Content = z.infer<typeof contentSchema>;
export const defaultContent: Content = {
  brand: {
    name: "ADS Solutions",
    tagline: "Where ads meet growth",
    logo: "/logo.jpeg",
    phone: "+91 9568151737",
    secondaryPhone: "+91 7505976499",
    proprietor: "Dushyant Kumar",
    whatsapp: "919568151737",
    email: "dushyantkumar9669@gmail.com",
    address: "",
    gstin: "09JQOPK8863A1Z8",
    udyam: "UDYAM-UP-18-0063498",
    instagram: "",
    facebook: "",
  },
  hero: {
    eyebrow: "SOCIAL MEDIA • META ADS • CONTENT • LEAD GENERATION",
    title: "We turn attention",
    highlight: "into growth.",
    description:
      "Your next chapter starts with the right strategy. We help creators and businesses grow with content that connects and advertising that works.",
    image: "",
    alt: "ADS Solutions creative work",
    cta: "Book a free strategy call",
  },
  about: {
    title: "Your ambition. Our next big project.",
    description:
      "ADS Solutions is a digital growth partner for creators, local businesses and service brands. From the first content idea to the next campaign, we bring strategy, creativity and consistent execution together.",
    mission:
      "Clear communication. Transparent pricing. A real focus on your business. We believe sustainable growth starts with a partnership you can trust.",
    image: "",
    alt: "The ADS Solutions team",
  },
  sections: {
    servicesTitle: "Everything your brand needs to grow.",
    servicesIntro:
      "From the first impression to the next enquiry, we connect the dots.",
    portfolioTitle: "Good ideas. Thoughtful execution.",
    portfolioIntro:
      "A few possibilities, brought to life. Explore our sample brand and campaign concepts below.",
    packagesTitle: "Big ambitions. Clear pricing.",
    testimonialsTitle: "Built on good partnerships.",
    ctaTitle: "Ready for your next chapter?",
    ctaDescription:
      "Tell us where you want to go. Let’s build a plan to get you there.",
  },
  services: [
    [
      "social",
      "Social media management",
      "A consistent presence on Instagram and Facebook, with content planning, publishing and community support.",
    ],
    [
      "ads",
      "Meta ads management",
      "Reach the right people with audience research, campaign setup and ongoing optimisation.",
    ],
    [
      "video",
      "Content & reels",
      "Strong hooks, structured scripts and thoughtfully edited reels that bring your brand to life.",
    ],
    [
      "leads",
      "Lead generation",
      "Turn attention into business enquiries with focused campaigns and clear conversion journeys.",
    ],
    [
      "brand",
      "Brand promotion",
      "Get your business in front of the people who matter, with a recognisable brand presence.",
    ],
    [
      "web",
      "Web development",
      "Fast, responsive websites designed around your business and your customers.",
    ],
    [
      "person",
      "Personal branding",
      "Build a distinctive voice and a credible online presence as a creator or professional.",
    ],
    [
      "consult",
      "Growth consultation",
      "A practical conversation about your goals, your audience and your next move.",
    ],
  ].map(([icon, title, description]) => ({
    id: icon,
    icon: icon as Content["services"][number]["icon"],
    title,
    description,
    image: "",
    alt: title,
    published: true,
  })),
  packages: [
    {
      id: "basic",
      name: "Basic",
      subtitle: "Build your foundation",
      price: 14999,
      category: "social",
      popular: false,
      published: true,
      features: [
        "Facebook & Instagram profile management",
        "10–15 reels edited each month",
        "Content ideas, scripts, captions & hashtags",
        "Meta ads management up to ₹15,000 ad spend",
        "Best-time posting & monthly reporting",
      ],
    },
    {
      id: "growth",
      name: "Growth",
      subtitle: "Make your next move",
      price: 19999,
      category: "social",
      popular: true,
      published: true,
      features: [
        "Complete Facebook & Instagram management",
        "18–20 reels edited each month",
        "Advanced scripts & premium thumbnails",
        "Meta ads management up to ₹20,000 ad spend",
        "Daily stories & basic community support",
        "Daily performance & lead monitoring",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      subtitle: "Think bigger. Go further.",
      price: 29999,
      category: "social",
      popular: false,
      published: true,
      features: [
        "25–30 high-quality reels each month",
        "End-to-end content & growth strategy",
        "Premium editing & creative hooks",
        "Ad management above ₹20,000 spend",
        "Daily community management",
        "Bi-monthly performance reviews",
      ],
    },
    {
      id: "starter-ads",
      name: "Starter ads",
      subtitle: "For ad spend up to ₹5,000",
      price: 2000,
      category: "ads",
      popular: false,
      published: true,
      features: [
        "Leads, sales or WhatsApp campaigns",
        "Basic audience targeting",
        "Performance monitoring",
      ],
    },
    {
      id: "growth-ads",
      name: "Growth ads",
      subtitle: "For ad spend ₹5,000–₹10,000",
      price: 3000,
      category: "ads",
      popular: false,
      published: true,
      features: [
        "Audience research & copywriting",
        "Campaign optimisation",
        "Regular performance tracking",
      ],
    },
    {
      id: "scale-ads",
      name: "Scale ads",
      subtitle: "For ad spend ₹10,000–₹20,000",
      price: 5000,
      category: "ads",
      popular: false,
      published: true,
      features: [
        "Advanced audience targeting",
        "Conversion tracking",
        "Daily campaign optimisation",
      ],
    },
  ],
  portfolio: [
    {
      id: "concept-forma",
      title: "Forma — a stronger everyday",
      description:
        "A fitness brand concept combining an editorial identity with a social-first launch direction.",
      category: "Brand & social",
      image: "/work/forma.svg",
      alt: "Forma fitness campaign concept in forest green",
      metric: "Sample concept · Not client work",
      video: "",
      published: true,
    },
    {
      id: "concept-nook",
      title: "Nook — the art of slowing down",
      description:
        "A boutique hospitality concept designed around quiet escapes and considered storytelling.",
      category: "Campaign creative",
      image: "/work/nook.svg",
      alt: "Nook boutique stay campaign concept in warm terracotta",
      metric: "Sample concept · Not client work",
      video: "",
      published: true,
    },
    {
      id: "concept-ritual",
      title: "Ritual — make it a daily thing",
      description:
        "An independent coffee brand concept with a warm visual language and community-led content direction.",
      category: "Brand & social",
      image: "/work/ritual.svg",
      alt: "Ritual coffee concept with golden yellow editorial artwork",
      metric: "Sample concept · Not client work",
      video: "",
      published: true,
    },
    {
      id: "concept-afterhours",
      title: "Afterhours — stories with a voice",
      description:
        "A creator series concept with a distinctive campaign identity and a short-form content direction.",
      category: "Creator campaigns",
      image: "/work/afterhours.svg",
      alt: "Afterhours creator series concept with lavender typography",
      metric: "Sample concept · Not client work",
      video: "",
      published: true,
    },
  ],
  testimonials: [],
  process: [
    {
      title: "Understand",
      description: "Your business, audience and goals. That’s where we start.",
    },
    {
      title: "Strategise",
      description: "A clear content and advertising plan, built around you.",
    },
    {
      title: "Create & launch",
      description:
        "Bring the plan to life with thoughtful creative and campaigns.",
    },
    {
      title: "Track & improve",
      description: "Review what works, learn from the data and keep growing.",
    },
  ],
  seo: {
    title: "ADS Solutions | Where Ads Meet Growth",
    description:
      "Social media management, Meta advertising, content and digital growth for creators and businesses. Explore transparent packages and book a free strategy call.",
  },
  legal: defaultLegal,
  tracking: { ga4: "", pixel: "", clarity: "" },
};
