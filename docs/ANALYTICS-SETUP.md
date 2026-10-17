# Analytics and launch configuration

## IDs needed for current browser integrations

In Admin → Website content → Tracking, enter the IDs and publish. These are public identifiers, not API secrets.

| Provider | Required value | Where to find it | Current use |
| --- | --- | --- | --- |
| Google Analytics 4 | Measurement ID beginning G- | Analytics → Admin → Data streams → Web stream | Page views, CTA clicks, successful enquiries/bookings |
| Meta | Numeric Pixel ID | Events Manager → select the website Pixel/data source → Settings | PageView, Lead, Schedule and custom CTA events |
| Microsoft Clarity | Project ID | Clarity project → Settings → Overview | Heatmaps, session insights and named interaction events |

No Google API key, GA Measurement Protocol secret, Meta access token, or Clarity export token is needed for the implemented browser tracking. Blank IDs disable integrations. Provider delivery has to be verified after entering real IDs; an 'ID configured' badge does not prove events were received.

The admin dashboard currently shows database lead/booking statistics and links to provider dashboards. It does not import GA4 visitor reports, Meta advertising spend or Clarity reports. Those would require separate server-side reporting integrations and scoped account access. Meta Conversions API and Google Ads conversion tags are not currently implemented; do not paste their secrets into CMS fields. Microsoft here means Clarity, not Microsoft Advertising/UET.

## Consent and event behaviour

- Essential only: no optional provider scripts loaded.
- Analytics only: configured GA4 and Clarity load; Google advertising consent is denied and Meta Pixel does not load.
- Allow all: configured analytics and Meta marketing measurement enabled.
- Cookie preferences in the footer allow changes. Changing a granted choice revokes provider consent, clears known first-party tracking cookies and session attribution, and reloads the document. Previously collected provider records are not automatically deleted.
- Consent storage is versioned; previous bundled analytics/advertising consent is requested again.
- Enquiry fields are marked for Clarity masking. Enable strict masking in the Clarity project and verify recordings before production use. Never pass names, emails, phone numbers or enquiry text to analytics event properties.
- In GA4 Enhanced Measurement, disable history-based page views if enabled: this app sends page_view on navigation itself. Disable automatic form-interaction collection if it is not wanted; app conversions are sent only on successful submissions.

## Verification with configured accounts

Use a new browser session: reject first and confirm no GA/Meta/Clarity script requests. Select Analytics only and verify that Meta is absent. Select Allow all and inspect GA4 Realtime, Meta Test Events and Clarity. Navigate two public pages and check page-view counts for duplicates. Submit a test enquiry only after server intake is configured and confirm a single successful Lead/Schedule event. Withdraw consent and verify optional scripts do not load after refresh.

## Business policies

Admin → Website content → Legal edits Privacy and Terms sections plus the updated date. Existing saved CMS documents receive initial legal defaults without a destructive database migration. Publish edits normally. Confirm these drafts against actual payment, cancellation, retention and ownership practices before launch; the website does not invent a fixed refund deadline or promise legal compliance. Do not rerun setup-new-project.sql on an installed database.

## Remaining external configuration

- SUPABASE_SERVICE_ROLE_KEY in .env.local/server environment: guest enquiry and booking intake. Keep private.
- Turnstile site key + server secret, REQUIRE_TURNSTILE=true: production intake protection.
- Final HTTPS site URL and Supabase Auth callback allowlist + working SMTP: production email confirmation/recovery.
- Optional WhatsApp Cloud API secrets: only for automated inbound webhook replies. Normal WhatsApp CTA links already work without them.
- Deployment/domain and actual analytics IDs are required before live verification.

Sources: https://support.google.com/analytics/answer/12270356 ; https://developers.google.com/tag-platform/security/guides/consent ; https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2 ; https://developers.facebook.com/docs/meta-pixel/get-started
