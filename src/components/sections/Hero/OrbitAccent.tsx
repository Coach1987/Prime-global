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
          cy="316"
          rx="432"
          ry="192"
          transform="rotate(-14 500 316)"
          stroke="rgba(120,186,255,0.255)"
          strokeWidth="0.9"
        />
      </svg>
    </div>
  );
}
