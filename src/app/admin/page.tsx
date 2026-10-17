import { requireUser } from "@/lib/data";
import { defaultContent, contentSchema } from "@/lib/content";
import { AdminDashboard } from "@/components/admin-dashboard";
import type { Lead, AdminSummary } from "@/lib/types";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin workspace",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  const { db, profile } = await requireUser(true);
  const [recent, summary, content] = await Promise.all([
    db.rpc("admin_records", { p_kind: "leads", p_limit: 6 }),
    db.rpc("admin_summary"),
    db.from("site_content").select("*").eq("id", "main").maybeSingle(),
  ]);
  if (recent.error || summary.error || content.error)
    throw new Error(
      "Unable to load workspace. Verify migrations and database access.",
    );
  return (
    <AdminDashboard
      leads={recent.data.rows as Lead[]}
      summary={summary.data as AdminSummary}
      content={
        content.data ? contentSchema.parse(content.data.body) : defaultContent
      }
      version={content.data?.version || 0}
      name={profile?.name || "Admin"}
    />
  );
}
