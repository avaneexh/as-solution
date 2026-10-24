import Link from "next/link";
export function PageState({
  missing = false,
  retry,
}: {
  missing?: boolean;
  retry?: () => void;
}) {
  return (
    <main className="page-state">
      <Link href="/" className="state-brand">
        <span aria-hidden="true">∞</span> ADS SOLUTIONS
      </Link>
      <div className="state-orbit" aria-hidden="true">
        <span>{missing ? "404" : "∞"}</span>
      </div>
      <p className="state-kicker">
        {missing ? "A SMALL DETOUR" : "LET’S TRY THAT AGAIN"}
      </p>
      <h1>{missing ? "A little off course." : "A momentary pause."}</h1>
      <p className="state-description">
        {missing
          ? "This page may have moved, or the link has taken a wrong turn. Your next chapter is still ahead."
          : "We couldn’t load this page right now. Try again, or head home and pick up where you left off."}
      </p>
      <div className="state-actions">
        {retry && (
          <button className="state-primary" onClick={retry}>
            Try again ↻
          </button>
        )}
        <Link href="/" className={retry ? "state-secondary" : "state-primary"}>
          Back to home ↗
        </Link>
      </div>
      <p className="state-footnote">WHERE ADS MEET GROWTH</p>
    </main>
  );
}
