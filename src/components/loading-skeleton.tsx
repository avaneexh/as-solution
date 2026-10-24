export function LoadingSkeleton({
  compact = false,
  dashboard = false,
}: {
  compact?: boolean;
  dashboard?: boolean;
}) {
  return (
    <div
      className={`loading-shell ${compact ? "loading-compact" : ""}`}
      role="status"
      aria-label={compact ? "Loading analytics" : "Loading page"}
      aria-busy="true"
    >
      <span className="loading-label">
        {compact ? "Preparing your insights…" : "Getting things ready…"}
      </span>
      <div aria-hidden="true">
        <div className="skeleton skeleton-eyebrow" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        {!compact && !dashboard && <div className="skeleton skeleton-hero" />}
        <div className="skeleton-grid">
          {[0, 1, 2].map((i) => (
            <div className="skeleton-card" key={i}>
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-value" />
              <div className="skeleton skeleton-line" />
            </div>
          ))}
        </div>
        {dashboard && <div className="skeleton skeleton-hero" />}
      </div>
    </div>
  );
}
