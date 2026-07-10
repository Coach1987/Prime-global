export function OrbitAccent() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    >
      <svg
        viewBox="0 0 500 500"
        className="h-full w-full overflow-visible"
        fill="none"
      >
        <g className="origin-center animate-[spin_28s_linear_infinite]">
          <ellipse
            cx="250"
            cy="250"
            rx="220"
            ry="118"
            transform="rotate(-18 250 250)"
            stroke="rgba(55,150,255,0.22)"
            strokeWidth="1.2"
          />

          <circle
            cx="458"
            cy="185"
            r="3"
            fill="rgba(95,180,255,0.75)"
          />
        </g>

        <g className="origin-center animate-[spin_36s_linear_infinite_reverse]">
          <ellipse
            cx="250"
            cy="250"
            rx="205"
            ry="104"
            transform="rotate(38 250 250)"
            stroke="rgba(115,190,255,0.14)"
            strokeWidth="1"
          />

          <circle
            cx="104"
            cy="370"
            r="2.5"
            fill="rgba(125,200,255,0.55)"
          />
        </g>
      </svg>
    </div>
  );
}
