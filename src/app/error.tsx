"use client";
import { PageState } from "@/components/page-state";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return <PageState retry={retry} />;
}
