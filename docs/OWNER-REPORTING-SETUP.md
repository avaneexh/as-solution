# Editing visibility and provider reporting

## UI-only editing visibility

Website content (including tracking IDs and media controls) is shown only when the authenticated admin email is avaneesh.gupta5@gmail.com. This is a UI preference, not an authorization boundary. Other admin accounts retain existing server/database publishing and media permissions. Existing authentication and client/admin isolation remain unchanged.

For report storage, run ONLY supabase/migrations/005_analytics_reports.sql in the existing Supabase SQL editor. It creates the private report cache and refresh claim function; it does not alter website editing policies. Do not rerun setup-new-project.sql.

Deploy the code and sign in with the designated account to see Website content. Other admins can still use CRM and report tabs.

## Google Analytics reports

1. Google Cloud Console: select/create a project and enable Google Analytics Data API.
2. IAM & Admin → Service Accounts: create a reporting service account.
3. Service account → Keys → Add key → Create new key → JSON (if your organization permits keys).
4. GA4 Admin → Property access management: add that JSON's client_email as Viewer.
5. GA4 Admin → Property details: copy the numeric Property ID, NOT Stream ID or G- Measurement ID.
6. Vercel project → Environment Variables (Production), add:
   - GA4_PROPERTY_ID: numeric property ID.
   - GA4_CLIENT_EMAIL: JSON client_email.
   - GA4_PRIVATE_KEY: complete JSON private_key including BEGIN/END lines.
     Actual newlines or literal backslash-n are both supported.
7. Keep these server-only. Do not add NEXT_PUBLIC_ and do not commit the JSON.

Choose the ADS Solutions property. Reports use the whole property, not just a
single stream: Audience and top traffic channels for the last 28 complete days.
The UI uses the property's reporting time zone. Collection IDs still belong in
CMS Tracking settings visible to the designated account.

## Microsoft Clarity reports

1. Open the correct Clarity project as a project admin.
2. Settings → Data Export → Generate new API token.
3. Store the token as CLARITY_API_TOKEN in Vercel's server environment.
4. Redeploy after adding all environment variables.

Clarity exports cover the previous 72 hours (UTC). The API supports at most
three days and 10 calls per project/day. Aggregate traffic/engagement/click
metrics are shown as returned; recordings and heatmaps remain in Clarity.
Treat bot-session and total-session counts as distinct provider fields.

## Cache and verification

Both integrations run only on the server after admin authentication. Supabase
stores aggregate reports with last-fetch timestamps. An atomic claim restricts
fetch attempts (including failures) to once per six hours, across instances.
Refresh view reloads that cache. It is demand-driven, not a background cron.
If a fetch fails, the last successful report remains visible with an error.
Credential fixes can take up to six hours to retry; a trusted operator may reset
next_fetch_at after fixing configuration, while respecting the Clarity quota.
No provider error response bodies or credentials are sent to the browser.

Without credentials, the dashboard shows Setup required, never sample numbers.
Live provider delivery still needs verification after credentials are supplied.

Sources:
- https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart
- https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api
