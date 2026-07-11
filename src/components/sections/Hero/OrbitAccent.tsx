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
          cy="320"
          rx="430"
          ry="210"
          transform="rotate(-16 500 320)"
          stroke="rgba(120,186,255,0.34)"
          strokeWidth="2.2"
        />
        <ellipse
          cx="500"
          cy="320"
          rx="430"
          ry="210"
          transform="rotate(-16 500 320)"
          stroke="rgba(95,167,255,0.18)"
          strokeWidth="5"
          strokeLinecap="round"
        />

        <circle cx="140" cy="430" r="18" fill="url(#heroOrbitPoint)" opacity="0.9" />
        <circle cx="822" cy="150" r="16" fill="url(#heroOrbitPoint)" opacity="0.88" />
        <circle cx="756" cy="522" r="14" fill="url(#heroOrbitPoint)" opacity="0.72" />

        <circle cx="140" cy="430" r="3.6" fill="rgba(150,220,255,0.95)" />
        <circle cx="822" cy="150" r="3.4" fill="rgba(150,220,255,0.95)" />
        <circle cx="756" cy="522" r="3" fill="rgba(150,220,255,0.9)" />

        <ellipse
          cx="500"
          cy="320"
          rx="430"
          ry="210"
          transform="rotate(-16 500 320)"
          stroke="rgba(132,196,255,0.2)"
          strokeWidth="1"
          strokeDasharray="1.6 9"
        />
      </svg>
    </div>
  );
}
