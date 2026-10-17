import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    try {
      const db = await supabase();
      const { error } = await db.auth.exchangeCodeForSession(code);
      if (!error)
        return NextResponse.redirect(
          new URL(safeNext(url.searchParams.get("next")), url.origin),
        );
    } catch {}
  }
  return NextResponse.redirect(
    new URL("/login?error=confirmation", url.origin),
  );
}
