"use client";
import { browserClient } from "@/lib/supabase/browser";
import { useState } from "react";
export function SignOut() {
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="sign-out"
        onClick={async () => {
          const { error } = await browserClient().auth.signOut();
          if (error) setError(error.message);
          else location.assign("/login");
        }}
      >
        Sign out ↗
      </button>
      {error && <small role="alert">{error}</small>}
    </>
  );
}
