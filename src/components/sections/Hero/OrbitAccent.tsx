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
          cy="312"
          rx="444"
          ry="198"
          transform="rotate(-16 500 320)"
          stroke="rgba(120,186,255,0.42)"
          strokeWidth="1.9"
        />
        <ellipse
          cx="500"
          cy="312"
          rx="444"
          ry="198"
          transform="rotate(-16 500 320)"
          stroke="rgba(95,167,255,0.12)"
          strokeWidth="3.8"
          strokeLinecap="round"
        />

        <circle cx="126" cy="430" r="18" fill="url(#heroOrbitPoint)" opacity="0.9" />
        <circle cx="840" cy="162" r="16" fill="url(#heroOrbitPoint)" opacity="0.88" />
        <circle cx="750" cy="520" r="14" fill="url(#heroOrbitPoint)" opacity="0.72" />

        <circle cx="126" cy="430" r="3.6" fill="rgba(150,220,255,0.95)" />
        <circle cx="840" cy="162" r="3.4" fill="rgba(150,220,255,0.95)" />
        <circle cx="750" cy="520" r="3" fill="rgba(150,220,255,0.9)" />

        <ellipse
          cx="500"
          cy="312"
          rx="444"
          ry="198"
          transform="rotate(-16 500 320)"
          stroke="rgba(132,196,255,0.14)"
          strokeWidth="0.9"
          strokeDasharray="1.4 10"
        />
      </svg>
    </div>
  );
}
