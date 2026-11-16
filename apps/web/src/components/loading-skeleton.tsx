type Layout = "default" | "exchange" | "profile" | "network";

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`loading-shape ${className}`} />;
}

export function ContentSkeleton({ layout = "default" }: { layout?: Layout }) {
  return <div role="status" aria-label="Loading content" className={`loading-content loading-content--${layout}`}>
    <span className="sr-only">Loading content</span>
    {Array.from({ length: layout === "network" ? 6 : 2 }, (_, index) =>
      <div className="loading-card" key={index} aria-hidden="true">
        <Skeleton className="loading-label" /><Skeleton className="loading-value" />
        <Skeleton className="loading-visual" /><Skeleton className="loading-line" />
      </div>)}
  </div>;
}

export function PageSkeleton({ layout = "default" }: { layout?: Layout }) {
  return <main className="loading-page" aria-busy="true">
    <div aria-hidden="true" className="loading-heading"><Skeleton className="loading-label" /><Skeleton className="loading-title" /></div>
    <ContentSkeleton layout={layout} />
  </main>;
}
