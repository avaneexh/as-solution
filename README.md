# ADS Solutions

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase Auth, PostgreSQL and Storage. Business content is based on the supplied proposal and portfolio. The supplied design mockups informed the blue/white visual direction; their sample client claims and testimonials have not been presented as real work.

## Run locally

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000. Without credentials the public website renders, but account access and submissions are visibly unavailable. There is no fake persistence, default admin password or authentication bypass.

## Connect Supabase

1. Create a Supabase project. Apply migrations `001_initial.sql` through `005_analytics_reports.sql`, in order, to a **new project** using the Supabase SQL editor. These are versioned migrations, not scripts to run repeatedly. For an existing project, apply only the missing migration. See [owner and reporting setup](docs/OWNER-REPORTING-SETUP.md).
2. Put the project URL and publishable key in `.env.local`. Put the service-role key in `SUPABASE_SERVICE_ROLE_KEY` **on the server only**. It is used only for validated guest enquiries, durable abuse limiting and authenticated provider webhooks. Never expose it through a `NEXT_PUBLIC_` variable or a source-control commit.
3. Set `NEXT_PUBLIC_SITE_URL` to the exact origin used in your browser (locally, `http://127.0.0.1:3000`). Origin verification protects form submissions; using `localhost` while this value is `127.0.0.1` will be rejected.
4. In Supabase Auth URL configuration, set the site URL and allow `<origin>/auth/callback` and callback URLs with the `next` query parameter (including the encoded password-recovery return URL). Enable email confirmation. Configure your own SMTP provider before real customer onboarding, configure auth rate limits and use a strong password policy.
5. Sign up through `/login` and confirm the email. Promote the intended owner using the SQL editor, replacing the example email:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'owner@example.com');
```

Public signup always creates a client. User-controlled signup metadata cannot grant admin access. Promote only a verified account you own. Existing Auth users created before the migration need a corresponding `profiles` row.

6. Sign in and visit `/admin`. Website content and tracking controls are shown only for avaneesh.gupta5@gmail.com. This is UI-only visibility; existing admin server/database permissions remain unchanged. See the reporting setup guide for analytics credentials.

## What is implemented

- Home, About, Services, Portfolio, Packages, Testimonials, Contact, Privacy and Terms routes, responsive navigation, metadata, robots and sitemap.
- Exact service-fee tiers from the portfolio, clear separate Meta ad spend, and client-provided raw-footage requirements.
- Supabase client/admin sign-in, email confirmation, password recovery and sign-out.
- Enquiry and preferred-time booking requests. Appointment requests are not automatic calendar reservations; admins confirm/reschedule them.
- Lead statuses, contact details, campaign source, follow-up dates, private notes, customer list, search, filtering, CSV export and audit trail.
- Client portal restricted to records created while that client was signed in. Guest records are deliberately not claimed by matching an unverified email address.
- Admin content editor with uploads to `site-media`, reorder/add/remove, publish toggles and optimistic-concurrency protection.
- WhatsApp CTAs, a website guided enquiry assistant, and optional Meta WhatsApp Cloud API webhook replies.
- Consent-gated GA4, Meta Pixel and Microsoft Clarity integration. Lead/Schedule events are sent only after a successful database commit. UTM attribution is collected only after consent.
- Row-level and column-level controls, input validation, honeypot, Turnstile integration, durable rate limiting, request idempotency, private notes separation and signed webhook verification.

The Supabase client is used directly rather than Prisma: RLS stays active for authenticated operations and there is no separate direct-database credential. The proposal permits equivalent technical solutions.

## Images and publication

Upload JPG, PNG, WebP, AVIF or MP4 up to 10 MB from the relevant editor field, or use an HTTPS media URL. Logo, hero, about, services, projects and testimonial images are editable. Add descriptive alt text. Clear the hero image to restore the branded graphic.

Portfolio and testimonials start empty because verified client work was not supplied. Add approved work and testimonials in the editor, then enable `Published`. The content document and media bucket are public: **do not upload private client files, credentials or confidential drafts**. Unpublished entries are hidden in the public UI, not a secure document vault. Replaced media files are retained to avoid breaking existing links; remove unused objects through Supabase Storage when safe.

## Production deployment

Use Vercel or a Node.js host compatible with Next.js server routes; a static export cannot run this app. Set the hosting project root to `website`, build command `npm run build`, and framework Next.js. For another Node host, use `npm run build` then `npm start` behind an HTTPS reverse proxy. Adjust the start hostname only if your hosting provider needs binding to `0.0.0.0`.

Required before accepting public enquiries:

- Set all Supabase values on the host and the final HTTPS `NEXT_PUBLIC_SITE_URL`.
- Create a Cloudflare Turnstile widget for that hostname. Configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `REQUIRE_TURNSTILE=true`.
- Set `RATE_LIMIT_SALT` to a long random secret. Production intake fails closed until Turnstile and this salt are configured.
- The reverse proxy must overwrite `x-forwarded-for` with the actual client IP. Do not accept an untrusted client-supplied header. Vercel's managed proxy can supply this header; verify your alternative host configuration.
- Update Supabase callback allowlists, configure SMTP and verify email confirmation and password reset end-to-end.
- Set GA4 / Pixel / Clarity IDs in admin. Check events in GA DebugView, Meta Test Events and Clarity after opting in; IDs alone do not prove delivery. Configure Clarity masking and restrict access to recordings.
- Publish actual portfolio assets, testimonials and social links. Review the generated Privacy/Terms copy for your actual operating and retention policies.
- Set provider backup/restore, database monitoring, uptime/error alerts and a retention process before launch. Confirm domain, HTTPS and Search Console ownership in your accounts.

The app does **not** provision paid accounts, publish a production deployment, purchase a domain, submit Search Console verification or activate tracking without the owner's account configuration.

## WhatsApp Cloud API (optional)

The website assistant and click-to-chat work without an API provider. For automated replies **inside WhatsApp**, use an approved Meta WhatsApp Business app/number, configure the five `WHATSAPP_*` secrets plus `WHATSAPP_API_VERSION` (a supported version selected in your Meta app dashboard), and subscribe its messages webhook to `<origin>/api/whatsapp/webhook`.

The webhook validates GET verification and raw-body HMAC signatures, checks the target phone number, ignores delivery-status events and deduplicates message IDs. It responds to inbound text with a numbered packages/services/enquiry/booking flow, using current CMS content. Enquiries and bookings link to the site's consent form. It does not proactively message leads or confirm bookings on their behalf. Provider permissions, message delivery and billing must be verified in the owner's account. A provider-accepted reply followed by a network failure can still cause a retry; this is best-effort deduplication, not an exactly-once delivery guarantee.

## Operations and limits

- Lead, customer, booking and audit lists use database-side pagination. Search and filters cover all records. Summary charts aggregate the entire dataset. CSV exports stream matching leads in batches and exclude records created after the export started; avoid editing/deleting the filtered records during export, because separate batches are not a single database snapshot. Large exports remain subject to the hosting provider’s request timeout.
- Audit records capture the actor, action and entity, excluding full private note contents. The UI paginates the full change history.
- No calendar synchronisation, payment processing, email notification queue, file-sharing portal or real-time campaign API reporting was specified. Booking changes are saved; the team contacts the customer separately.
- Keep lead retention aligned with your published policy. Periodically remove expired `rate_limits` rows (e.g. older than one day) and old `webhook_messages` (e.g. older than 30 days) using your database maintenance process. Audit retention should be decided by the owner. Do not delete active webhook claims.
- GA4 and Clarity aggregate reports are imported into the admin dashboard with server credentials and a six-hour durable cache. Heatmaps and recordings remain in Clarity. Missing credentials show setup instructions, not fabricated visitor counts.

## Validation

```powershell
npm run typecheck
npm test
npm run build
```

`npm test` runs input/redirect/CSV/signature tests and the actual SQL migrations against embedded PostgreSQL (PGlite). It emulates Supabase roles, auth claims and Storage tables to exercise client isolation, privilege denial, private notes, admin publishing, transaction rollback, duplicate intake and durable rate limiting. It is not a substitute for testing hosted Supabase Auth, Storage HTTP APIs, SMTP, Turnstile or Meta delivery.

See `docs/REQUIREMENTS.md` for the scope mapping and `docs/LAUNCH-CHECKLIST.md` for connected-environment acceptance checks.

Implementation references: [Next.js data security](https://nextjs.org/docs/app/guides/data-security), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Meta webhook verification](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/).

## Public design refinements

The public site includes a persistent light/dark switch (system preference by default), a branded desktop cursor follower, pointer parallax, and restrained entrance animations. Touch pointers and reduced-motion preferences disable the cursor and parallax. The native pointer is hidden only while the custom cursor is visible; it returns for form inputs, touch/reduced-motion modes, and when leaving the page. All content remains visible without animation JavaScript.

Four original sample campaign SVGs are included under `public/work`; these are clearly labelled concept studies, not client results. Their titles, copy, categories, artwork URLs and publishing status are editable in Admin → Content → Portfolio. Existing saved CMS content is preserved. Remove or replace sample records before using the portfolio as real client evidence.

Admin access is directly through `/admin`; the public navigation and footer contain no admin link. Public pages have tailored metadata, Open Graph/Twitter text, and Organization JSON-LD. Set `NEXT_PUBLIC_SITE_URL` to the final public origin for canonicals and sitemap URLs. Deployment and search indexing are separate from these local changes.


Physical addresses and map links are omitted from public pages and structured data. Public content serialization also blanks the address field. Decorative background spheres respond to mouse position on desktop and stay static for touch and reduced-motion preferences.


## Connected project setup

The project configuration is stored locally in the ignored `.env.local`. The publishable key only allows public/client operations; it cannot install the schema, create administrator accounts, or perform server-only guest intake.

For a new empty project, run `supabase/setup-new-project.sql` in its SQL editor instead of running the four migrations separately. This generated file wraps all four migrations, profile backfill, and the current editable site-content seed in one transaction. It is not a repeatable migration for an existing installation. Regenerate after changing defaults with `npx tsx scripts/prepare-database.ts`. The database tests verify the combined script and role isolation.

After schema installation, use `/login` to register and confirm the intended owner email, then promote that exact verified account with the SQL shown above. Add the server-only Supabase service-role/secret key to `.env.local` under `SUPABASE_SERVICE_ROLE_KEY` for enquiry/booking intake. Do not expose it in browser code. Production also needs the final site URL, Auth callback allowlist, SMTP, and Turnstile before accepting public submissions. Optional GA4/Meta/Clarity tracking and WhatsApp Cloud API require their own account configuration.

Analytics ID requirements, consent behaviour, editable Privacy/Terms and remaining provider setup: see docs/ANALYTICS-SETUP.md. On Windows environments where Turbopack's CSS worker cannot launch, use npx next build --webpack for the supported production build alternative.

