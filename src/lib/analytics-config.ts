export function cleanReportingValue(value: string | undefined): string {
  const text = (value || "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1).trim();
  return text;
}
export function reportingConfig(env: Record<string, string | undefined>) {
  return {
    property: cleanReportingValue(env.GA4_PROPERTY_ID),
    email: cleanReportingValue(env.GA4_CLIENT_EMAIL),
    key: cleanReportingValue(env.GA4_PRIVATE_KEY).replace(/\\n/g, "\n"),
    clarity: cleanReportingValue(env.CLARITY_API_TOKEN),
  };
}
export function reportingIssue(provider: "ga4" | "clarity", env: Record<string, string | undefined>): string | null {
  const c = reportingConfig(env);
  const fields = provider === "ga4"
    ? [["GA4_PROPERTY_ID", c.property], ["GA4_CLIENT_EMAIL", c.email], ["GA4_PRIVATE_KEY", c.key]]
    : [["CLARITY_API_TOKEN", c.clarity]];
  const missing = fields.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) return `Missing from this deployment: ${missing.join(", ")}. Add these to this Vercel project's deployment environment, then redeploy.`;
  if (provider === "ga4" && !/^\d+$/.test(c.property))
    return "GA4_PROPERTY_ID must be the numeric property ID, not a G- measurement ID or URL.";
  return null;
}
