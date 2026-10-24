import { z } from "zod";
export type ReportSection = {
  title: string;
  columns: string[];
  rows: string[][];
};
export type AnalyticsReport = { period: string; sections: ReportSection[] };
export type ReportState = {
  provider: "ga4" | "clarity";
  report: AnalyticsReport | null;
  fetchedAt: string | null;
  message: string | null;
};
const cell = z.object({ value: z.string().optional() });
const googleSchema = z.object({
  rows: z
    .array(
      z.object({
        dimensionValues: z.array(cell).optional(),
        metricValues: z.array(cell),
      }),
    )
    .optional(),
});
export function googleRows(value: unknown): string[][] {
  return (googleSchema.parse(value).rows || []).map((row) =>
    [...(row.dimensionValues || []), ...row.metricValues].map(
      (v) => v.value || "0",
    ),
  );
}
const claritySchema = z.array(
  z.object({
    metricName: z.string(),
    information: z.array(
      z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
    ),
  }),
);
export function claritySections(value: unknown): ReportSection[] {
  // Only aggregate metrics; no raw URLs, page titles, or visitor identifiers.
  const allowed = new Set([
    "Traffic",
    "EngagementTime",
    "ScrollDepth",
    "DeadClickCount",
    "RageClickCount",
    "QuickbackClick",
    "ScriptErrorCount",
    "ErrorClickCount",
    "ExcessiveScroll",
  ]);
  return claritySchema
    .parse(value)
    .filter((m) => allowed.has(m.metricName.replaceAll(" ", "")))
    .map((metric) => {
      const rows = metric.information.slice(0, 30);
      const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))].filter(
        (key) =>
          rows.every(
            (row) => row[key] == null || Number.isFinite(Number(row[key])),
          ),
      );
      return {
        title: metric.metricName.replace(/([a-z])([A-Z])/g, "$1 $2"),
        columns: keys.map((k) => k.replace(/([a-z])([A-Z])/g, "$1 $2")),
        rows: rows.map((row) =>
          keys.map((k) => (row[k] == null ? "—" : String(row[k]))),
        ),
      };
    })
    .filter((s) => s.columns.length > 0);
}
