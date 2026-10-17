import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { databaseReady } from "@/lib/data";
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};
export default async function Login() {
  const ready = await databaseReady();
  return (
    <main className="auth-shell">
      <aside className="auth-story">
        <a className="brand" href="/">
          <span className="footer-mark">∞</span>
          <span>
            <strong>ADS Solutions</strong>
            <small>WHERE ADS MEET GROWTH</small>
          </span>
        </a>
        <div>
          <span className="eyebrow">YOUR BUSINESS. YOUR NEXT CHAPTER.</span>
          <h1>
            Good things
            <br />
            grow together.
          </h1>
          <p>
            A clear view of your requests, conversations
            <br />
            and next steps. All in one place.
          </p>
        </div>
        <small>Strategy · Creativity · Growth</small>
      </aside>
      <section className="auth-form">
        <Suspense fallback={<p>Loading sign in…</p>}>
          <AuthForm ready={ready} />
        </Suspense>
      </section>
    </main>
  );
}
