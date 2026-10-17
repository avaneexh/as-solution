"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <h1>Something didn’t load.</h1>
      <p>Please try again. If it continues, contact our team.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
      <a href="/">Back home</a>
    </main>
  );
}
