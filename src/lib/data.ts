import "server-only";
import { cache } from "react";
import { configured, supabase } from "./supabase/server";
import { contentSchema, defaultContent } from "./content";
import { redirect } from "next/navigation";
export const getContent = cache(async () => {
  if (!configured()) return defaultContent;
  const db = await supabase();
  const { data, error } = await db
    .from("site_content")
    .select("body")
    .eq("id", "main")
    .maybeSingle();
  // A fresh connected project has no schema yet. Keep public pages available
  // during setup, but never mask other database failures as sample content.
  if (error?.code === "PGRST205") return defaultContent;
  if (error) throw new Error("Website content is temporarily unavailable.");
  if (!data) return defaultContent;
  return contentSchema.parse(data.body);
});
export const databaseReady = cache(async () => {
  if (!configured()) return false;
  const db = await supabase();
  const { error } = await db.from("site_content").select("id").limit(1);
  return !error;
});
// Do not serialize the private address into public React component payloads.
export const getPublicContent = cache(async () => {
  const content = await getContent();
  return { ...content, brand: { ...content.brand, address: "" } };
});
export async function requireUser(admin = false) {
  const login = `/login?next=${admin ? "/admin" : "/portal"}`;
  if (!configured()) redirect(`${login}&setup=1`);
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(login);
  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (admin && profile?.role !== "admin") redirect("/portal");
  return { db, user, profile };
}
