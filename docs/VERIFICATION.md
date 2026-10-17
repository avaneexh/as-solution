# Verification record

Verified locally on 4 October 2026.

- TypeScript check passed.
- 17 automated tests passed, including the four actual SQL migrations executed by embedded PostgreSQL, role and RLS boundaries, private notes, atomic booking intake, duplicate submissions, content concurrency, rate limits, webhook signatures, CSV formula escaping and redirect safety.
- Reporting tests create 1,010 additional leads and verify results beyond the first 1,000, non-overlapping pages, search, customer filtering, booking search and aggregate counts.
- Production build passed, including TypeScript compilation.
- Public pages, login, robots and sitemap passed HTTP checks. Admin, client portal and CSV export redirected unauthenticated users to login. Invalid intake returned 400; foreign-origin requests and invalid webhook verification returned 403.
- Browser review covered desktop and mobile layouts, mobile navigation, package category switching, guided WhatsApp links, booking/enquiry switching and the disabled setup state when Supabase is absent.
- A final browser screenshot attempt on 4 October was blocked by the browser tool's URL security policy. No alternative browser mechanism was used to bypass it. The earlier visual checks remain recorded; the later reporting changes passed code/database checks but have not been exercised with a hosted admin session.

These checks do not verify a live Supabase project, hosted Auth/Storage HTTP APIs, SMTP delivery, Turnstile, analytics event receipt, Meta message delivery or production hosting. No credentials were supplied, and no customer records or WhatsApp messages were created on an external service. Follow LAUNCH-CHECKLIST.md after configuration.
