"use client";

import { useEffect, useRef, useState } from "react";

const MAP_POINTS = [
  // North America
  [180, 215], [220, 190], [262, 178], [308, 184], [352, 206], [378, 238], [350, 266], [304, 274], [255, 258], [214, 236],
  // South America
  [360, 328], [388, 356], [404, 390], [398, 426], [382, 462], [370, 500], [352, 538], [332, 570], [304, 548], [312, 506], [324, 468], [334, 430],
  // Europe
  [688, 190], [726, 176], [768, 182], [796, 200], [776, 226], [740, 228], [704, 216],
  // Africa
  [738, 258], [778, 286], [806, 322], [814, 364], [796, 404], [772, 446], [748, 486], [714, 514], [684, 486], [688, 444], [702, 400], [718, 356],
  // Middle East + Asia
  [848, 210], [892, 190], [942, 182], [996, 188], [1050, 206], [1094, 230], [1142, 248], [1194, 252], [1240, 240], [1282, 232], [1324, 244], [1368, 266],
  [1404, 294], [1426, 328], [1408, 354], [1368, 366], [1318, 366], [1268, 354], [1220, 334], [1170, 316], [1120, 304], [1066, 294], [1008, 292], [956, 304],
  // Australia
  [1268, 506], [1318, 494], [1368, 506], [1400, 530], [1392, 560], [1354, 576], [1308, 574], [1272, 556], [1248, 532],
] as const;

function WorldMapIllustration({ transform }: { transform: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[8%] h-[58%] opacity-[0.9] will-change-transform sm:h-[60%] md:h-[62%]" style={{ transform }}>
      <svg
        viewBox="0 0 1600 820"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mapRouteLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="50%" stopColor="rgba(132,199,255,0.96)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
          </linearGradient>
          <linearGradient id="mapRouteGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(168,220,255,0.95)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <g opacity="0.72" fill="#71B5FF" stroke="#9FD2FF" strokeWidth="0.85">
          {MAP_POINTS.map(([x, y], index) => (
            <circle key={`map-dot-${index}`} cx={x} cy={y} r={2.35 + ((index + 1) % 3) * 0.35} />
          ))}
        </g>

        <g opacity="0.85" fill="none" stroke="url(#mapRouteLine)" strokeWidth="1.3" strokeLinecap="round">
          <path d="M220 190 C360 120 575 130 740 180" />
          <path d="M740 180 C910 235 1110 260 1320 244" />
          <path d="M240 240 C420 280 560 300 740 258" />
          <path d="M740 258 C940 306 1120 332 1368 266" />
          <path d="M388 356 C506 390 620 420 778 286" />
          <path d="M778 286 C908 230 1040 235 1240 240" />
          <path d="M404 390 C490 456 580 482 714 514" />
          <path d="M714 514 C920 535 1130 550 1318 494" />
          <path d="M324 468 C400 530 490 558 684 486" />
          <path d="M684 486 C908 472 1080 470 1268 506" />
        </g>

        <g
          opacity="0.92"
          fill="none"
          stroke="url(#mapRouteGlow)"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="motion-reduce:animate-none animate-[glow-pulse_11s_ease-in-out_infinite]"
        >
          <path d="M220 190 C360 120 575 130 740 180" />
          <path d="M740 180 C910 235 1110 260 1320 244" />
          <path d="M388 356 C506 390 620 420 778 286" />
          <path d="M714 514 C920 535 1130 550 1318 494" />
        </g>

        <g className="motion-reduce:animate-none animate-[glow-pulse_9s_ease-in-out_infinite]">
          <circle cx="220" cy="190" r="3" fill="#E8F7FF" />
          <circle cx="740" cy="180" r="3.2" fill="#88C8FF" />
          <circle cx="1320" cy="244" r="3" fill="#DDF4FF" />
          <circle cx="388" cy="356" r="3" fill="#88C8FF" />
          <circle cx="778" cy="286" r="3.2" fill="#E8F7FF" />
          <circle cx="1240" cy="240" r="3" fill="#88C8FF" />
          <circle cx="714" cy="514" r="3.2" fill="#DDF4FF" />
          <circle cx="1318" cy="494" r="3" fill="#88C8FF" />
        </g>
      </svg>
    </div>
  );
}

export function HeroBackground() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    const updateOffset = (event: MouseEvent) => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        const x = ((event.clientX / window.innerWidth) - 0.5) * 10;
        const y = ((event.clientY / window.innerHeight) - 0.5) * 10;
        setOffset({ x, y });
      });
    };

    window.addEventListener("pointermove", updateOffset, { passive: true });

    return () => {
      window.removeEventListener("pointermove", updateOffset);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const mapTransform = `translate3d(${offset.x * 0.4}px, ${offset.y * 0.3}px, 0)`;
  const glowTransform = `translate3d(${offset.x * 0.75}px, ${offset.y * 0.55}px, 0)`;

  return (
    <div aria-hidden="true" className="absolute inset-0 bg-[#06101e]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(78,133,255,0.32),transparent_38%),radial-gradient(circle_at_82%_18%,rgba(83,198,255,0.2),transparent_26%),linear-gradient(180deg,#0a1730_0%,#102447_42%,#0a1830_70%,#071426_100%)]" />
      <div className="absolute inset-0 opacity-[0.13] bg-[linear-gradient(rgba(167,202,255,0.26)_1px,transparent_1px),linear-gradient(90deg,rgba(167,202,255,0.24)_1px,transparent_1px)] bg-[size:96px_96px]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:210px_210px] [mask-image:linear-gradient(180deg,transparent,rgba(0,0,0,0.96),transparent)]" />

      <div className="absolute left-1/2 top-[44%] h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2d72ff]/24 blur-[188px]" style={{ transform: `translate3d(-50%, -50%, 0) translate3d(${offset.x}px, ${offset.y}px, 0)` }} />
      <div className="absolute right-[-10%] top-[15%] h-[460px] w-[460px] rounded-full bg-[#58beff]/15 blur-[165px]" />
      <div className="absolute left-[-10%] top-[34%] h-[420px] w-[420px] rounded-full bg-[#3e6edb]/12 blur-[160px]" />
      <div className="absolute inset-x-[7%] top-[11%] h-px bg-gradient-to-r from-transparent via-blue-200/40 to-transparent" />
      <div className="absolute inset-x-[5%] top-[58%] h-px bg-gradient-to-r from-transparent via-cyan-200/42 to-transparent" />
      <div className="absolute inset-x-[8%] bottom-[18%] h-px bg-gradient-to-r from-transparent via-blue-300/28 to-transparent" />
      <div className="absolute inset-0 animate-[gradient-shift_34s_ease-in-out_infinite] bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.08)_30%,transparent_58%,rgba(80,170,255,0.08)_100%)] opacity-70" />

      <div className="absolute left-[16%] top-[24%] h-2 w-2 rounded-full bg-white/70 animate-[drift-1_20s_ease-in-out_infinite]" />
      <div className="absolute right-[16%] top-[28%] h-[6px] w-[6px] rounded-full bg-cyan-200/80 animate-[drift-2_22s_ease-in-out_infinite]" />
      <div className="absolute bottom-[24%] left-[18%] h-1.5 w-1.5 rounded-full bg-gold/70 animate-[drift-3_18s_ease-in-out_infinite]" />
      <div className="absolute bottom-[20%] right-[12%] h-2 w-2 rounded-full bg-white/55 animate-[drift-1_24s_ease-in-out_infinite]" />

      <WorldMapIllustration transform={mapTransform} />

      <div className="absolute inset-0 opacity-[0.24] will-change-transform" style={{ transform: glowTransform }}>
        <div className="absolute left-[16%] top-[20%] h-[420px] w-[420px] rounded-full bg-blue-400/10 blur-[170px]" />
        <div className="absolute bottom-[10%] right-[10%] h-[360px] w-[360px] rounded-full bg-gold/10 blur-[160px]" />
        <div className="absolute inset-0 animate-[gradient-shift_30s_ease-in-out_infinite] bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.06)_28%,transparent_66%,rgba(90,176,255,0.08)_100%)] opacity-70" />
      </div>

      <div className="absolute inset-x-0 bottom-[12%] h-[180px] opacity-55">
        <svg viewBox="0 0 1600 220" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M0 160 C260 100 460 200 730 140 C930 95 1140 178 1600 88" stroke="rgba(90,170,255,0.34)" strokeWidth="1.2" fill="none" />
          <path d="M0 198 C290 132 500 230 770 170 C1020 112 1240 200 1600 130" stroke="rgba(110,195,255,0.24)" strokeWidth="1" fill="none" />
        </svg>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-[#071426] via-[#071426]/60 to-transparent" />
    </div>
  );
}
