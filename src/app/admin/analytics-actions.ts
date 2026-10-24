"use server";
import { requireUser } from "@/lib/data";
import { loadProvider } from "@/lib/analytics-server";
export async function fetchAnalyticsReports() {
  await requireUser(true);
  return Promise.all([loadProvider("ga4"), loadProvider("clarity")]);
}
