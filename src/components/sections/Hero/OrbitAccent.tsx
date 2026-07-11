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
        <defs>
          <radialGradient id="heroOrbitPoint" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(158,221,255,1)" />
            <stop offset="100%" stopColor="rgba(66,152,255,0)" />
          </radialGradient>
        </defs>

        <ellipse
          cx="500"
          cy="316"
          rx="432"
          ry="192"
          transform="rotate(-14 500 316)"
          stroke="rgba(120,186,255,0.46)"
          strokeWidth="1.9"
        />
        <ellipse
          cx="500"
          cy="316"
          rx="432"
          ry="192"
          transform="rotate(-14 500 316)"
          stroke="rgba(100,176,255,0.16)"
          strokeWidth="3.8"
          strokeLinecap="round"
        />

        <circle cx="144" cy="454" r="18" fill="url(#heroOrbitPoint)" opacity="0.9" />
        <circle cx="846" cy="176" r="16" fill="url(#heroOrbitPoint)" opacity="0.88" />
        <circle cx="744" cy="516" r="13" fill="url(#heroOrbitPoint)" opacity="0.7" />

        <circle cx="144" cy="454" r="3.6" fill="rgba(150,220,255,0.95)" />
        <circle cx="846" cy="176" r="3.4" fill="rgba(150,220,255,0.95)" />
        <circle cx="744" cy="516" r="3" fill="rgba(150,220,255,0.9)" />

        <ellipse
          cx="500"
          cy="316"
          rx="432"
          ry="192"
          transform="rotate(-14 500 316)"
          stroke="rgba(132,196,255,0.18)"
          strokeWidth="0.9"
          strokeDasharray="1.4 9"
        />
      </svg>
    </div>
  );
}
