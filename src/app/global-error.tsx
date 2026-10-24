"use client";
import { PageState } from "@/components/page-state";
import "./globals.css";
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <PageState retry={retry} />
      </body>
    </html>
  );
}
