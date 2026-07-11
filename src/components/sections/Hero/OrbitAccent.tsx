export function OrbitAccent() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    >
      <svg
        viewBox="0 0 600 600"
        className="h-full w-full overflow-visible"
        fill="none"
      >
        <ellipse
          cx="300"
          cy="300"
          rx="240"
          ry="116"
          transform="rotate(-19 300 300)"
          stroke="rgba(132,196,255,0.16)"
          strokeWidth="0.85"
          strokeDasharray="2.5 9"
        />
      </svg>
    </div>
  );
}
