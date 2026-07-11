type OrbitAccentProps = {
  layer: "back" | "front";
};

export function OrbitAccent({ layer }: OrbitAccentProps) {
  const isFront = layer === "front";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-visible"
    >
      <svg
        viewBox="0 0 600 600"
        className="h-full w-full overflow-visible"
        fill="none"
      >
        <defs>
          <linearGradient id={`orbitBody-${layer}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F9FCFF" />
            <stop offset="45%" stopColor="#DCEEFF" />
            <stop offset="100%" stopColor="#7FB9E8" />
          </linearGradient>
          <linearGradient id={`orbitHighlight-${layer}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.24)" />
            <stop offset="100%" stopColor="rgba(127,185,232,0)" />
          </linearGradient>
          <filter id={`orbitGlow-${layer}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id={`orbitArrowHead-${layer}`} markerWidth="9" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 L9 4 L0 8 Z" fill="#F8FBFF" />
          </marker>
          <mask id={`orbitMask-${layer}`}>
            <rect width="600" height="600" fill="white" />
            <circle cx="300" cy="300" r="152" fill="black" />
          </mask>
        </defs>

        <g
          className="orbit-anim motion-reduce:animate-none [animation:orbit-spin_12s_linear_infinite]"
          style={{ transformOrigin: "center", transformBox: "fill-box" }}
        >
          <path
            d="M 482 250 C 424 202 360 184 300 198 C 236 213 182 254 144 318"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          <path
            d="M 482 250 C 424 202 360 184 300 198 C 236 213 182 254 144 318"
            stroke={`url(#orbitBody-${layer})`}
            strokeOpacity={isFront ? 0.58 : 0.18}
            strokeWidth={isFront ? 4.6 : 3.8}
            strokeLinecap="round"
          />

          <path
            d="M 482 250 C 424 202 360 184 300 198 C 236 213 182 254 144 318"
            stroke={`url(#orbitHighlight-${layer})`}
            strokeOpacity={isFront ? 0.72 : 0.4}
            strokeWidth={isFront ? 1.6 : 1.2}
            strokeLinecap="round"
          />

          <g mask={isFront ? undefined : `url(#orbitMask-${layer})`}>
            <path
              d="M 482 250 C 424 202 360 184 300 198 C 236 213 182 254 144 318"
              stroke={`url(#orbitBody-${layer})`}
              strokeOpacity={isFront ? 0.96 : 0.28}
              strokeWidth={isFront ? 6.4 : 4.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={`url(#orbitArrowHead-${layer})`}
              filter={`url(#orbitGlow-${layer})`}
            />
            <path
              d="M 482 250 C 424 202 360 184 300 198 C 236 213 182 254 144 318"
              stroke={`url(#orbitHighlight-${layer})`}
              strokeOpacity={isFront ? 0.8 : 0.3}
              strokeWidth={isFront ? 1.9 : 1.3}
              strokeLinecap="round"
              markerEnd={`url(#orbitArrowHead-${layer})`}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
