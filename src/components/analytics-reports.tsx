"use client";
import { useEffect, useState } from "react";
import { fetchAnalyticsReports } from "@/app/admin/analytics-actions";
import type { ReportState } from "@/lib/analytics-format";
import { LoadingSkeleton } from "./loading-skeleton";
export function AnalyticsReports() {
  const [reports, setReports] = useState<ReportState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setReports(await fetchAnalyticsReports());
    } catch {
      setError("Your insights are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Website analytics</h2>
        <button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh view"}
        </button>
      </div>
      <p className="table-help">
        Provider reports refresh at most once every six hours when viewed.
        Refreshing this view reuses the stored report.
      </p>
      {loading && !reports.length && <LoadingSkeleton compact />}
      {error && (
        <div className="report-notice" role="status">
          <strong>{error}</strong>
          <p>
            {reports.some((item) => item.report)
              ? "Your last available reports are shown below."
              : "Refresh the page to reconnect and try again."}
          </p>
          <button
            className="state-secondary"
            onClick={() => window.location.reload()}
          >
            Reload page ↻
          </button>
        </div>
      )}
      {reports.map((item) => (
        <article key={item.provider} className="report-section">
          <h3>
            {item.provider === "ga4"
              ? "Google Analytics 4"
              : "Microsoft Clarity"}
          </h3>
          {item.message && (
            <div className="report-notice" role="status">
              <p>
                {item.report
                  ? "The latest update is taking longer than usual. Your previous report is available below."
                  : "This report isn’t available yet. Please check back shortly."}
              </p>
            </div>
          )}
          {item.report && (
            <>
              <p className="table-help">
                {item.report.period} · Last fetched{" "}
                {item.fetchedAt
                  ? new Date(item.fetchedAt).toLocaleString()
                  : "unknown"}
                {item.message ? " · Showing previous report" : ""}
              </p>
              {!item.report.sections.length && (
                <p>No aggregate data was returned for this period.</p>
              )}
              {item.report.sections.map((section, i) => (
                <div key={i} style={{ marginTop: 20 }}>
                  <h4>{section.title}</h4>
                  {!section.rows.length ? (
                    <p>No data for this period.</p>
                  ) : (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            {section.columns.map((name, j) => (
                              <th key={j}>{name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((row, j) => (
                            <tr key={j}>
                              {row.map((value, k) => (
                                <td key={k}>{value}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </article>
      ))}
    </section>
  );
}
