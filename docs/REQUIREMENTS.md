# Scope mapping

Sources: `proposal.pdf`, `proposal.docx`, `ADS_Solutions_Clean_Portfolio.pdf`, `logo.jpeg`, and both images in `ideas/`. Documents are requirements references; their payment/handover clauses were not treated as instructions to withhold source or contact anyone.

| Requirement | Implementation | Activation / remaining verification |
| --- | --- | --- |
| Next.js + Tailwind + Supabase | App Router, TypeScript, Tailwind 4, Auth/Postgres/Storage | Configure a Supabase project |
| Home / about / services / work / testimonials / contact | Public routes and responsive sections | Approved work and testimonials are not yet supplied |
| Social packages | ₹14,999 / ₹19,999 / ₹29,999 per month | Owner can update in CMS |
| Standalone Meta tiers | ₹2,000 / ₹3,000 / ₹5,000 per month | Separate ad spend disclosed |
| User + admin | Auth, client portal, server authorization and database RLS | Create owner account and promote through SQL |
| All public imagery controlled by admin | Logo, hero, about, service, portfolio and testimonial upload fields | Storage migration and credentials |
| Admin content | Business details, hero, about, services, packages, portfolio, testimonials, section headings, process, SEO, tracking IDs | Publish initial content |
| Lead intake | Validated API, atomic database function, consent and source | Turnstile + server key + origin + rate salt |
| Booking system | Preferred time, manual confirmation, reschedule and statuses | Team confirms by contacting client |
| CRM tracker | Search, filters, lead stages, follow-ups, private notes, CSV, converted customer list | Database-side pagination and full-dataset summary reports |
| Client tracking | Own enquiries and bookings | Sign in before submission |
| WhatsApp CTAs | Correct business number, contextual enquiry links | Click-to-chat ready |
| Basic chatbot | On-site guided flow and optional signed Cloud API webhook | Meta account/number/API credentials for in-WhatsApp automation |
| Analytics / heatmaps / ads | GA4, Clarity, Pixel, opt-in, UTM, conversion events | Provider project IDs and delivery verification |
| Technical SEO | Metadata, semantic structure, sitemap, robots, image alt fields | Final domain + Search Console verification |
| Legal/business information | Provided contact, address, GSTIN and Udyam values | Owner verification before publishing |
| Production deployment | Buildable server app and deployment guide | Hosting credentials/domain not supplied; no public deployment made |
| Tests | Validation and PostgreSQL RLS/transaction tests, production build, local browser checks | Hosted Auth/Storage/provider integration acceptance required |

The setup uses direct Supabase APIs in place of Prisma to preserve database policies throughout authenticated access. No automated campaign management, rankings guarantee, paid provider subscription or fabricated performance figures are included.
