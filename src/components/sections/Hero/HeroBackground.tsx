"use client";

import { useEffect, useRef, useState } from "react";

function WorldMapIllustration({ transform }: { transform: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-[0.83] will-change-transform" style={{ transform }}>
      <svg viewBox="0 0 1800 900" className="h-full w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="0" y="0" width="1800" height="900" fill="none" />

        <g opacity="0.35" stroke="#82C4FF" strokeWidth="1" fill="none">
          {Array.from({ length: 13 }).map((_, index) => (
            <line key={`v-${index}`} x1={120 + index * 130} y1="60" x2={120 + index * 130} y2="840" />
          ))}
          {Array.from({ length: 10 }).map((_, index) => (
            <line key={`h-${index}`} x1="70" y1={90 + index * 80} x2="1720" y2={90 + index * 80} />
          ))}
        </g>

        <g opacity="0.3" fill="none" stroke="#5AA8FF" strokeWidth="1.2" strokeLinecap="round">
          <path d="M220 210 C310 170 325 165 410 210" />
          <path d="M410 210 C500 175 590 178 690 230" />
          <path d="M690 230 C825 200 940 220 1090 260" />
          <path d="M1090 260 C1240 295 1320 310 1460 300" />
          <path d="M250 370 C340 350 430 360 525 420" />
          <path d="M525 420 C650 490 760 470 850 405" />
          <path d="M850 405 C970 350 1060 354 1190 445" />
          <path d="M1190 445 C1310 490 1400 500 1490 470" />
          <path d="M255 640 C365 615 440 620 580 690" />
          <path d="M580 690 C760 760 905 745 1140 675" />
          <path d="M1140 675 C1280 625 1380 620 1510 655" />
        </g>

        <g opacity="0.72" fill="#7DB8FF" stroke="#A7D4FF" strokeWidth="1.1">
          {[
            [220, 210], [410, 210], [690, 230], [1090, 260], [1460, 300],
            [250, 370], [525, 420], [850, 405], [1190, 445], [1490, 470],
            [255, 640], [580, 690], [1140, 675], [1510, 655],
            [320, 195], [560, 185], [770, 215], [920, 255], [1320, 290],
            [350, 380], [610, 445], [790, 440], [1040, 370], [1270, 445],
            [360, 688], [690, 645], [970, 705], [1350, 670],
          ].map(([x, y], index) => (
            <circle key={`dot-${index}`} cx={x} cy={y} r={2.5 + ((index % 3) * 0.4)} />
          ))}
        </g>

        <g opacity="0.96" fill="none" stroke="url(#networkLine)" strokeWidth="1.3" strokeLinecap="round">
          <path d="M220 210 C330 180 375 175 410 210" />
          <path d="M410 210 C520 180 615 182 690 230" />
          <path d="M690 230 C850 210 980 230 1090 260" />
          <path d="M1090 260 C1245 290 1370 295 1460 300" />
          <path d="M250 370 C355 350 455 360 525 420" />
          <path d="M525 420 C660 500 760 480 850 405" />
          <path d="M850 405 C1025 340 1110 350 1190 445" />
          <path d="M1190 445 C1320 490 1400 500 1490 470" />
          <path d="M255 640 C395 620 490 620 580 690" />
          <path d="M580 690 C745 760 880 745 1140 675" />
          <path d="M1140 675 C1275 630 1400 625 1510 655" />
        </g>

        <g opacity="0.95" fill="none" stroke="url(#routeGlow)" strokeWidth="1.8" strokeLinecap="round" className="motion-reduce:animate-none animate-[glow-pulse_8s_ease-in-out_infinite]">
          <path d="M220 210 C330 180 375 175 410 210" />
          <path d="M690 230 C850 210 980 230 1090 260" />
          <path d="M525 420 C660 500 760 480 850 405" />
          <path d="M580 690 C745 760 880 745 1140 675" />
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
  const networkTransform = `translate3d(${offset.x * 0.65}px, ${offset.y * 0.45}px, 0)`;
  const glowTransform = `translate3d(${offset.x * 0.75}px, ${offset.y * 0.55}px, 0)`;

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#030814]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(68,120,255,0.24),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(84,175,255,0.16),transparent_24%),linear-gradient(180deg,#030814_0%,#071221_42%,#02060d_100%)]" />
      <div className="absolute inset-0 opacity-[0.1] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:80px_80px]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:220px_220px] [mask-image:linear-gradient(180deg,transparent,rgba(0,0,0,0.95),transparent)]" />

      <div className="absolute left-1/2 top-[46%] h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1d6cff]/22 blur-[190px]" style={{ transform: `translate3d(-50%, -50%, 0) translate3d(${offset.x}px, ${offset.y}px, 0)` }} />
      <div className="absolute right-[-8%] top-[20%] h-[500px] w-[500px] rounded-full bg-[#4fa3ff]/14 blur-[160px]" />
      <div className="absolute left-[-8%] top-[32%] h-[380px] w-[380px] rounded-full bg-white/8 blur-[150px]" />
      <div className="absolute inset-x-[8%] top-[10%] h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />
      <div className="absolute inset-x-[6%] top-[54%] h-[1px] -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent" />
      <div className="absolute inset-0 animate-[gradient-shift_28s_ease-in-out_infinite] bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.08)_28%,transparent_56%,rgba(201,162,75,0.06)_100%)] opacity-70" />

      <div className="absolute left-[16%] top-[24%] h-2 w-2 rounded-full bg-white/70 animate-[drift-1_20s_ease-in-out_infinite]" />
      <div className="absolute right-[16%] top-[28%] h-[6px] w-[6px] rounded-full bg-cyan-200/80 animate-[drift-2_22s_ease-in-out_infinite]" />
      <div className="absolute bottom-[24%] left-[18%] h-1.5 w-1.5 rounded-full bg-gold/70 animate-[drift-3_18s_ease-in-out_infinite]" />
      <div className="absolute bottom-[20%] right-[12%] h-2 w-2 rounded-full bg-white/55 animate-[drift-1_24s_ease-in-out_infinite]" />

      <WorldMapIllustration transform={mapTransform} />

      <div className="pointer-events-none absolute inset-0 opacity-90 will-change-transform" style={{ transform: networkTransform }}>
        <svg viewBox="0 0 1400 800" className="h-full w-full motion-reduce:animate-none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="networkLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="50%" stopColor="rgba(125,211,252,0.9)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </linearGradient>
            <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="50%" stopColor="rgba(140,200,255,0.95)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <g opacity="0.72" stroke="url(#networkLine)" strokeWidth="1.2" fill="none" strokeLinecap="round">
            <path d="M200 220 C300 185 395 195 515 190" />
            <path d="M515 190 C635 180 735 182 835 220" />
            <path d="M835 220 C930 255 1035 260 1260 195" />
            <path d="M290 360 C390 370 470 385 565 435" />
            <path d="M565 435 C690 485 760 470 840 405" />
            <path d="M840 405 C930 385 1035 385 1115 470" />
            <path d="M475 620 C570 635 650 640 760 690" />
            <path d="M760 690 C860 705 955 692 1160 645" />
            <path d="M620 235 C650 310 650 395 655 420" />
            <path d="M740 475 C805 525 900 560 1115 470" />
          </g>
          <g opacity="0.95" stroke="url(#routeGlow)" strokeWidth="1.8" fill="none" strokeLinecap="round" className="animate-[glow-pulse_10s_ease-in-out_infinite] motion-reduce:animate-none">
            <path d="M200 220 C300 185 395 195 515 190" />
            <path d="M515 190 C635 180 735 182 835 220" />
            <path d="M835 220 C930 255 1035 260 1260 195" />
            <path d="M290 360 C390 370 470 385 565 435" />
            <path d="M565 435 C690 485 760 470 840 405" />
            <path d="M840 405 C930 385 1035 385 1115 470" />
            <path d="M475 620 C570 635 650 640 760 690" />
            <path d="M760 690 C860 705 955 692 1160 645" />
            <path d="M620 235 C650 310 650 395 655 420" />
            <path d="M740 475 C805 525 900 560 1115 470" />
          </g>
          <g className="animate-[glow-pulse_8s_ease-in-out_infinite] motion-reduce:animate-none">
            <circle cx="200" cy="220" r="3.2" fill="#F8FAFC" />
            <circle cx="515" cy="190" r="3.4" fill="#8CC8FF" />
            <circle cx="835" cy="220" r="3.4" fill="#F8FAFC" />
            <circle cx="1260" cy="195" r="3.2" fill="#8CC8FF" />
            <circle cx="565" cy="435" r="3.2" fill="#F8FAFC" />
            <circle cx="840" cy="405" r="3.2" fill="#8CC8FF" />
            <circle cx="1115" cy="470" r="3.2" fill="#F8FAFC" />
            <circle cx="760" cy="690" r="3.2" fill="#8CC8FF" />
            <circle cx="1160" cy="645" r="3.2" fill="#F8FAFC" />
          </g>
        </svg>
      </div>

      <div className="absolute inset-0 opacity-[0.24] will-change-transform" style={{ transform: glowTransform }}>
        <div className="absolute left-[16%] top-[20%] h-[420px] w-[420px] rounded-full bg-blue-400/10 blur-[170px]" />
        <div className="absolute bottom-[10%] right-[10%] h-[360px] w-[360px] rounded-full bg-gold/10 blur-[160px]" />
        <div className="absolute inset-0 animate-[gradient-shift_30s_ease-in-out_infinite] bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.06)_28%,transparent_66%,rgba(201,162,75,0.06)_100%)] opacity-70" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-[#02060d] to-transparent" />
    </div>
  );
}
