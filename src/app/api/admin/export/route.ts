import { requireUser } from "@/lib/data";
import { csvCell } from "@/lib/validation";
import type { Lead } from "@/lib/types";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const { db } = await requireUser(true);
  const query = new URL(request.url).searchParams;
  const kind = query.get("kind") === "customers" ? "customers" : "leads";
  const search = (query.get("search") || "").slice(0, 200),
    status = (query.get("status") || "All").slice(0, 40),
    before = new Date().toISOString();
  const columns = [
    "id",
    "name",
    "email",
    "phone",
    "business",
    "service",
    "status",
    "source",
    "follow_up_at",
    "created_at",
  ] as const;
  const encoder = new TextEncoder();
  let page = 1;
  let cancelled = false;
  const read = () =>
    db.rpc("admin_records", {
      p_kind: kind,
      p_search: search,
      p_status: status,
      p_page: page,
      p_limit: 1000,
      p_before: before,
    });
  const first = await read();
  if (first.error)
    return Response.json(
      { error: "Export could not be prepared." },
      { status: 503 },
    );
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode("\uFEFF" + columns.join(",") + "\r\n"));
      let result: Awaited<ReturnType<typeof read>> = first;
      try {
        while (!cancelled) {
          if (result.error) throw result.error;
          const rows = result.data.rows as Lead[];
          for (const row of rows) {
            if (cancelled) return;
            controller.enqueue(
              encoder.encode(
                columns.map((c) => csvCell(row[c])).join(",") + "\r\n",
              ),
            );
          }
          if (rows.length < 1000 || page * 1000 >= result.data.total) break;
          page++;
          result = await read();
        }
        if (!cancelled) controller.close();
      } catch (error) {
        if (!cancelled) controller.error(error);
      }
    },
    cancel() {
      cancelled = true;
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ads-leads.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
