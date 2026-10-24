import "server-only";
import { reportingConfig, reportingIssue } from "./analytics-config";
import { createSign } from "node:crypto";
import { serviceClient } from "./supabase/server";
import {
  claritySections,
  googleRows,
  type AnalyticsReport,
  type ReportState,
} from "./analytics-format";

async function jsonFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      `Provider returned HTTP ${response.status}. Check credentials, property access and API quota.`,
    );
  return response.json();
}
async function googleReport(): Promise<AnalyticsReport> {
  const config = reportingConfig(process.env);
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: config.email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(config.key, "base64url");
  const token = await jsonFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (typeof token.access_token !== "string")
    throw new Error("Google authentication did not return an access token.");
  const run = (metrics: string[], dimensions: string[] = [], limit = 10) =>
    jsonFetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${config.property}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
          metrics: metrics.map((name) => ({ name })),
          dimensions: dimensions.map((name) => ({ name })),
          limit,
          ...(dimensions.length
            ? { orderBys: [{ metric: { metricName: metrics[0] }, desc: true }] }
            : {}),
        }),
      },
    );
  const [overview, sources] = await Promise.all([
    run(["activeUsers", "sessions", "screenPageViews", "engagedSessions"]),
    run(["sessions", "engagedSessions"], ["sessionDefaultChannelGroup"]),
  ]);
  return {
    period: "Last 28 complete days · GA4 property time zone",
    sections: [
      {
        title: "Audience",
        columns: ["Active users", "Sessions", "Page views", "Engaged sessions"],
        rows: googleRows(overview),
      },
      {
        title: "Top traffic channels",
        columns: ["Channel", "Sessions", "Engaged sessions"],
        rows: googleRows(sources),
      },
    ],
  };
}
async function clarityReport(): Promise<AnalyticsReport> {
  const data = await jsonFetch(
    "https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=3",
    {
      headers: { Authorization: `Bearer ${reportingConfig(process.env).clarity}` },
    },
  );
  return { period: "Previous 72 hours · UTC", sections: claritySections(data) };
}
export async function loadProvider(
  provider: "ga4" | "clarity",
): Promise<ReportState> {
  const result: ReportState = {
    provider,
    report: null,
    fetchedAt: null,
    message: null,
  };
  const issue = reportingIssue(provider, process.env);
  if (issue) return { ...result, message: issue };
  try {
    const db = serviceClient();
    const claim = await db.rpc("claim_analytics_fetch", {
      p_provider: provider,
    });
    if (claim.error)
      return {
        ...result,
        message:
          "Reporting storage unavailable. Apply database migration 005 and verify the server key.",
      };
    if (claim.data === true) {
      try {
        const report = await (provider === "ga4"
          ? googleReport()
          : clarityReport());
        const fetchedAt = new Date().toISOString();
        const saved = await db
          .from("analytics_reports")
          .update({
            report,
            fetched_at: fetchedAt,
            error: null,
          })
          .eq("provider", provider);
        if (saved.error) throw new Error("Report could not be stored.");
      } catch (error) {
        // Never serialize SDK errors, private keys, JWTs, or provider response bodies.
        const message =
          error instanceof Error &&
          error.message.startsWith("Provider returned HTTP ")
            ? error.message
            : "Report retrieval failed. Check server credentials and provider configuration.";
        await db
          .from("analytics_reports")
          .update({ error: message })
          .eq("provider", provider);
      }
    }
    const cached = await db
      .from("analytics_reports")
      .select("report,fetched_at,error")
      .eq("provider", provider)
      .single();
    if (cached.error)
      return { ...result, message: "Stored report is unavailable." };
    return {
      ...result,
      report: cached.data.report,
      fetchedAt: cached.data.fetched_at,
      message:
        cached.data.error ||
        (!cached.data.report
          ? "Report pending. Refresh after a moment; failed attempts retry after six hours."
          : null),
    };
  } catch {
    return {
      ...result,
      message:
        "Reporting is unavailable. Verify Supabase server configuration.",
    };
  }
}
