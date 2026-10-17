import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { contentSchema, defaultContent } from "@/lib/content";
import { verifySignature, botReply } from "@/lib/whatsapp";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  if (
    process.env.WHATSAPP_VERIFY_TOKEN &&
    q.get("hub.mode") === "subscribe" &&
    q.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN
  )
    return new Response(q.get("hub.challenge") || "");
  return new Response("Forbidden", { status: 403 });
}
export async function POST(req: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const api = process.env.WHATSAPP_API_VERSION;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret || !token || !phoneId || !api || !/^v\d+\.0$/.test(api) || !site)
    return new Response("Not configured", { status: 503 });
  const raw = await req.text();
  if (raw.length > 1000000) return new Response("Too large", { status: 413 });
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), secret))
    return new Response("Forbidden", { status: 403 });
  try {
    const payload = JSON.parse(raw);
    if (payload.object !== "whatsapp_business_account")
      return NextResponse.json({ ok: true });
    const db = serviceClient();
    const { data: stored, error: contentError } = await db
      .from("site_content")
      .select("body")
      .eq("id", "main")
      .maybeSingle();
    if (contentError) throw contentError;
    const c = stored ? contentSchema.parse(stored.body) : defaultContent;
    for (const entry of payload.entry || [])
      for (const change of entry.changes || []) {
        if (change.value?.metadata?.phone_number_id !== phoneId) continue;
        for (const message of change.value?.messages || []) {
          if (
            message.type !== "text" ||
            !message.id ||
            !/^\d{8,16}$/.test(message.from)
          )
            continue;
          const { data: claimed, error } = await db.rpc(
            "claim_webhook_message",
            { p_id: message.id },
          );
          if (error) throw error;
          if (!claimed) continue;
          const reply = botReply(
            String(message.text?.body || "").slice(0, 1000),
            c,
            site,
          );
          try {
            const response = await fetch(
              `https://graph.facebook.com/${api}/${phoneId}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: message.from,
                  type: "text",
                  text: { body: reply.slice(0, 4000) },
                }),
                signal: AbortSignal.timeout(12000),
              },
            );
            if (!response.ok) throw new Error("Provider unavailable");
            const { error: saveError } = await db
              .from("webhook_messages")
              .update({ status: "sent" })
              .eq("id", message.id);
            if (saveError) throw saveError;
          } catch (e) {
            await db
              .from("webhook_messages")
              .update({ status: "failed" })
              .eq("id", message.id);
            throw e;
          }
        }
      }
    return NextResponse.json({ ok: true });
  } catch {
    return new Response("Retry later", { status: 500 });
  }
}
