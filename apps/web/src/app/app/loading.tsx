import { Skeleton } from "@/components/loading-skeleton";
import "./app.css";

export default function Loading() {
  return (
    <div className="app-page">
      <main className="app-main" aria-busy="true" aria-label="Loading solver network">
        <header className="app-intro">
          <h1>Solver <em>network</em></h1>
        </header>
        <div className="app-network">
          <Skeleton className="loading-visual" />
        </div>
      </main>
    </div>
  );
}
