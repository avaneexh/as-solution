import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { enquirySchema } from "@/lib/validation";
import { serviceClient, supabase } from "@/lib/supabase/server";
export async function POST(req: Request) {
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3000" : "");
    if (!siteUrl)
      return NextResponse.json(
        {
          error: "Online enquiries are being configured. Please use WhatsApp.",
        },
        { status: 503 },
      );
    const expected = new URL(siteUrl).origin;
    if (req.headers.get("origin") !== expected)
      return NextResponse.json(
        { error: "Request origin is not allowed." },
        { status: 403 },
      );
    const raw = await req.text();
    if (raw.length > 16000)
      return NextResponse.json(
        { error: "Request is too large." },
        { status: 413 },
      );
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const parsed = enquirySchema.safeParse(json);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    const v = parsed.data;
    if (v.website)
      return NextResponse.json(
        { error: "Unable to submit this request." },
        { status: 400 },
      );
    const db = serviceClient();
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.RATE_LIMIT_SALT ||
        process.env.REQUIRE_TURNSTILE !== "true" ||
        !process.env.TURNSTILE_SECRET_KEY)
    )
      return NextResponse.json(
        {
          error:
            "Online enquiries are being configured. Please contact us on WhatsApp.",
        },
        { status: 503 },
      );
    if (process.env.REQUIRE_TURNSTILE === "true") {
      if (!process.env.TURNSTILE_SECRET_KEY || !v.turnstile)
        return NextResponse.json(
          { error: "Complete the security check." },
          { status: 400 },
        );
      const verification = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body: new URLSearchParams({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: v.turnstile,
          }),
          signal: AbortSignal.timeout(10000),
        },
      ).then((r) => r.json());
      if (
        !verification.success ||
        verification.hostname !== new URL(expected).hostname
      )
        return NextResponse.json(
          { error: "Security check failed. Please retry." },
          { status: 400 },
        );
    }
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const bucket = createHmac(
      "sha256",
      process.env.RATE_LIMIT_SALT || "development-only",
    )
      .update(ip)
      .digest("hex");
    const { data: allowed, error: rateError } = await db.rpc(
      "consume_rate_limit",
      { p_key: bucket },
    );
    if (rateError) throw rateError;
    if (!allowed)
      return NextResponse.json(
        { error: "Too many requests. Please try again in 15 minutes." },
        { status: 429 },
      );
    const auth = await supabase();
    const {
      data: { user },
    } = await auth.auth.getUser();
    const { data, error } = await db.rpc("submit_enquiry", {
      p_request_id: v.request_id,
      p_user_id: user?.id || null,
      p_name: v.name,
      p_email: v.email,
      p_phone: v.phone,
      p_business: v.business,
      p_service: v.service,
      p_message: v.message,
      p_type: v.type,
      p_preferred_at: v.type === "booking" ? v.preferred_at : null,
      p_attribution: v.attribution || {},
    });
    if (error) throw error;
    return NextResponse.json(
      { reference: data },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Your request could not be saved. Please retry or contact us on WhatsApp.",
      },
      { status: 503 },
    );
  }
}
