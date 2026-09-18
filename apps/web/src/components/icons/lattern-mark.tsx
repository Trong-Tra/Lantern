export function LatternMark({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 32 44"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 1v5m0 30v7M9 8h14M10 34h12M16 7C-2 16 2 27 16 35 30 27 34 16 16 7Z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M16 7C7 17 8 27 16 35M16 7c9 10 8 20 0 28M16 7v28"
        stroke="currentColor"
        strokeWidth=".7"
      />
    </svg>
  );
}
