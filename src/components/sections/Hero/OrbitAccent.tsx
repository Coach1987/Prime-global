export function OrbitAccent() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    >
      <svg
        viewBox="0 0 1000 700"
        className="h-full w-full overflow-visible"
        fill="none"
      >
        <ellipse
          cx="500"
          cy="320"
          rx="426"
          ry="186"
          transform="rotate(-14 500 316)"
          stroke="rgba(130,192,255,0.31)"
          strokeWidth="1.05"
        />
      </svg>
    </div>
  );
}
