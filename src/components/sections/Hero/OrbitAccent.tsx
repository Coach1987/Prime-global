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
        {/* First orbit */}
        <g className="origin-center animate-[spin_42s_linear_infinite]">
          <ellipse
            cx="300"
            cy="300"
            rx="255"
            ry="128"
            transform="rotate(-18 300 300)"
            stroke="rgba(115,185,255,0.12)"
            strokeWidth="0.8"
          />

          <circle
            cx="552"
            cy="230"
            r="2"
            fill="#8CC8FF"
          />
        </g>

        {/* Second orbit */}
        <g className="origin-center animate-[spin_58s_linear_infinite_reverse]">
          <ellipse
            cx="300"
            cy="300"
            rx="235"
            ry="115"
            transform="rotate(32 300 300)"
            stroke="rgba(170,215,255,0.08)"
            strokeWidth="0.8"
          />

          <circle
            cx="105"
            cy="395"
            r="1.8"
            fill="#B8DDFF"
          />
        </g>

        {/* Third orbit */}
        <g className="origin-center animate-[spin_70s_linear_infinite]">
          <ellipse
            cx="300"
            cy="300"
            rx="214"
            ry="100"
            transform="rotate(-63 300 300)"
            stroke="rgba(120,190,255,0.05)"
            strokeWidth="0.7"
          />
        </g>
      </svg>
    </div>
  );
}
