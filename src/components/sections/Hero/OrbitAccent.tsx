export function OrbitAccent() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
      <svg viewBox="0 0 600 600" className="h-full w-full overflow-visible" fill="none">
        <defs>
          <linearGradient id="orbitHalo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8FCFF" />
            <stop offset="50%" stopColor="#B8D9F7" />
            <stop offset="100%" stopColor="#73AEE7" />
          </linearGradient>
        </defs>

        <circle cx="300" cy="300" r="168" stroke="rgba(125, 186, 255, 0.24)" strokeWidth="1.2" />
        <circle cx="300" cy="300" r="198" stroke="url(#orbitHalo)" strokeOpacity="0.22" strokeWidth="1.2" />
        <circle cx="300" cy="300" r="226" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        <path d="M244 180c38-20 74-20 112 0" stroke="rgba(255,255,255,0.28)" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M182 248c20-34 54-56 92-66" stroke="rgba(125,186,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M418 252c20 34 28 72 20 112" stroke="rgba(125,186,255,0.2)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
