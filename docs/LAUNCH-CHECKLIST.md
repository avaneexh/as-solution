# Connected-environment acceptance

Run after applying migrations and setting environment values. Use dedicated test accounts and remove test business records when finished.

1. Create clients A and B; confirm both emails. Create owner account; promote it to admin through SQL. Verify client signup metadata cannot change role.
2. Client A submits an enquiry and booking while signed in. The successful reference must match a database record. Reload the portal and confirm persistence. Client B must not see A's records via the app or Supabase API.
3. Submit as a guest. Verify admin visibility and absence from unrelated client accounts. Retry the same request UUID and verify one lead/booking exists.
4. Verify Turnstile with the exact production hostname, missing/invalid challenges, the honeypot and cross-origin rejection. Exceed five submissions per 15 minutes from one trusted client IP and verify HTTP 429.
5. Admin changes status, adds private notes, sets follow-up and confirms/reschedules a booking. Verify client-visible status/time, hidden notes and audit entries. Ensure confirmation requires a valid future time.
6. Change each CMS image field and alt text; reload public pages. Test JPG/PNG/WebP/AVIF/MP4, 10 MB limit, unauthorised uploads, publication toggles, reorder and concurrent publish conflict handling.
7. Check browser keyboard focus, mobile navigation, booking form validation, package tabs, work filters, WhatsApp prefilled messages, empty states and error recovery.
8. Test sign-out, expired session refresh, password reset and email confirmation from the actual domain. Review SMTP delivery and Supabase auth rate limits.
9. Reject analytics and verify GA/Meta/Clarity requests are absent. Opt in and verify page/CTA/Lead/Schedule events; navigate between pages and revoke consent. Check masking of contact fields and avoid putting personal details in UTM parameters.
10. If Cloud API is enabled, verify webhook handshake, valid/invalid HMAC, correct phone number routing, numbered replies, duplicate webhook handling and failed-provider retries. Do not use real customer numbers for testing without authorization.
11. Validate the live sitemap, title/description, noindex of login/admin/portal, robots, HTTPS, redirect allowlists, origin setting, error monitoring and backups. Submit the domain in Search Console as the owner.
12. Agree retention, privacy text, actual client testimonials and media rights. Test reporting with more than 1,000 records and confirm filtered CSV exports.

Local verification is recorded separately from these steps: a successful build or embedded database test does not mark live services as verified.
