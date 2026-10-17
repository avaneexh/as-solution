"use server";
import { requireUser } from "@/lib/data";
import { contentSchema } from "@/lib/content";
import { updateLeadSchema, updateBookingSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { RecordPage } from "@/lib/types";
export async function fetchRecords(input: unknown): Promise<RecordPage> {
  const { db } = await requireUser(true);
  const q = z
    .object({
      kind: z.enum(["leads", "customers", "bookings", "activity"]),
      search: z.string().max(200),
      status: z.string().max(40),
      page: z.number().int().min(1).max(1000000),
    })
    .parse(input);
  const { data, error } = await db.rpc("admin_records", {
    p_kind: q.kind,
    p_search: q.search,
    p_status: q.status,
    p_page: q.page,
    p_limit: 15,
  });
  if (error) throw new Error("Records could not be loaded. Please retry.");
  return data as RecordPage;
}
export async function saveContent(body: unknown, version: number) {
  const { db } = await requireUser(true);
  const parsed = contentSchema.safeParse(body);
  if (!parsed.success)
    return {
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("\n"),
    };
  const { data, error } = await db.rpc("publish_content", {
    p_body: parsed.data,
    p_version: version,
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { version: Number(data) };
}
export async function saveLead(input: unknown) {
  const { db } = await requireUser(true);
  const v = updateLeadSchema.safeParse(input);
  if (!v.success) return { error: v.error.issues[0].message };
  const { id, notes, ...fields } = v.data;
  const { error } = await db.rpc("update_lead_record", {
    p_id: id,
    p_status: fields.status,
    p_follow_up_at: fields.follow_up_at,
    p_notes: notes,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/portal");
  return { ok: true };
}
export async function saveBooking(input: unknown) {
  const { db } = await requireUser(true);
  const v = updateBookingSchema.safeParse(input);
  if (!v.success) return { error: v.error.issues[0].message };
  const { id, notes, ...fields } = v.data;
  const { error } = await db.rpc("update_booking_record", {
    p_id: id,
    p_status: fields.status,
    p_scheduled_at: fields.scheduled_at,
    p_notes: notes,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/portal");
  return { ok: true };
}
export async function deleteLead(id: string) {
  const { db } = await requireUser(true);
  if (!z.uuid().safeParse(id).success) return { error: "Invalid record." };
  const { error } = await db.from("leads").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/portal");
  return { ok: true };
}
