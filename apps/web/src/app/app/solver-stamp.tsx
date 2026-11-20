const seals = [
  "m4 8 4 3 4-6 4 6 4-3-2 10H6L4 8Zm3 13h10",
  "m12 3 7 8-7 9-7-9 7-8Zm-7 8h14m-7-8-3 8 3 9 3-9-3-8Z",
  "m12 4 2.3 5 5.5.7-4 3.9.9 5.4-4.7-2.6-4.7 2.6.9-5.4-4-3.9 5.5-.7L12 4Z",
  "M12 3v2m0 14v2M3 12h6m6 0h6M12 5l3 7-3 7-3-7 3-7Z",
  "M10 8a4.5 4.5 0 1 1 5 7.2A4.5 4.5 0 0 1 10 8ZM4 17c1.4-3.4 9.9-9.1 13.3-9.8 3.4-.8 3.5.7 1.7 2.7C15 14.5 3 21 4 17Z",
  "m3 18 6-9 3 5 3-8 6 12H3Zm10-7 2 1 2-2",
  "m12 4 7 4v8l-7 4-7-4V8l7-4Zm0 4 4 4-4 4-4-4 4-4Z",
  "M10 20V9l9-4v11m-9-4 9-4M10 20c-2.2 2-6 1-5-1s4-2.3 5-1m9-2c-2.2 2-6 1-5-1s4-2.3 5-1",
] as const;

const podiumFrames = [
  "M16 2l3 3 6 1 1 6 3 4-3 4-1 6-6 1-3 3-3-3-6-1-1-6-3-4 3-4 1-6 6-1Z",
  "M16 2l10 6 3 8-3 8-10 6-10-6-3-8 3-8Z M6 8l3 3m17-3-3 3M6 24l3-3m17 3-3-3",
  "M16 3c4 0 6 2 10 3v10c0 6-4 9-10 13C10 25 6 22 6 16V6c4-1 6-3 10-3Z M9 24l-5-3m19 3 5-3",
] as const;

export function PodiumEmblem({ rank, ornate = false }: Readonly<{ rank: number; ornate?: boolean }>) {
  return (
    <svg className="app-podium-emblem" viewBox={ornate ? "0 0 32 32" : "0 0 24 24"} aria-hidden="true">
      {ornate && (
        <>
          <path className="app-podium-frame" d={podiumFrames[rank - 1]} />
          <circle className="app-podium-beading" cx="16" cy="16" r="10" />
        </>
      )}
      <path className="app-podium-glyph" transform={ornate ? "translate(7.6 7.6) scale(.7)" : undefined} d={seals[rank - 1]} />
    </svg>
  );
}

export function SolverStamp({ rank }: Readonly<{ rank: number }>) {
  const index = rank <= 8 ? rank - 1 : 3 + (rank - 9) % 5;
  const art = seals[index];

  return (
    <span className="app-id-badge" data-rank={rank} data-podium={rank <= 3} aria-hidden="true">
      {rank <= 3 ? <PodiumEmblem rank={rank} ornate /> : (
        <svg viewBox="0 0 24 24">
          <path d={art} />
        </svg>
      )}
    </span>
  );
}
