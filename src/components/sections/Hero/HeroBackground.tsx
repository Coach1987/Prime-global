"use client";

import { useEffect, useRef, useState } from "react";

export function HeroBackground() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const updateOffset = (event: MouseEvent) => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        const x = ((event.clientX / window.innerWidth) - 0.5) * 20;
        const y = ((event.clientY / window.innerHeight) - 0.5) * 20;
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

  const mapTransform = `translate3d(${offset.x * 0.4}px, ${offset.y * 0.4}px, 0)`;
  const networkTransform = `translate3d(${offset.x * 0.6}px, ${offset.y * 0.6}px, 0)`;
  const glowTransform = `translate3d(${offset.x * 0.8}px, ${offset.y * 0.8}px, 0)`;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-[#030814]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(68,120,255,0.18),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(84,175,255,0.16),transparent_24%),linear-gradient(180deg,#030814_0%,#071221_42%,#02060d_100%)]" />

      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:72px_72px]" />

      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:220px_220px] [mask-image:linear-gradient(180deg,transparent,rgba(0,0,0,0.85),transparent)]" />

      <div
        className="absolute left-1/2 top-[42%] h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1d6cff]/15 blur-[180px]"
        style={{ transform: `translate3d(-50%, -50%, 0) translate3d(${offset.x}px, ${offset.y}px, 0)` }}
      />
      <div className="absolute right-[-8%] top-[16%] h-[480px] w-[480px] rounded-full bg-[#4fa3ff]/12 blur-[140px]" />
      <div className="absolute left-[-8%] top-[30%] h-[360px] w-[360px] rounded-full bg-white/6 blur-[140px]" />
      <div className="absolute inset-x-[10%] top-[10%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="absolute inset-x-[6%] top-[50%] h-[1px] -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent" />
      <div className="absolute inset-0 animate-[gradient-shift_24s_ease-in-out_infinite] bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.08)_28%,transparent_56%,rgba(201,162,75,0.07)_100%)] opacity-70" />

      <div className="absolute left-[10%] top-[22%] h-2 w-2 rounded-full bg-white/60 animate-[drift-1_18s_ease-in-out_infinite]" />
      <div className="absolute right-[16%] top-[28%] h-[6px] w-[6px] rounded-full bg-cyan-200/80 animate-[drift-2_20s_ease-in-out_infinite]" />
      <div className="absolute bottom-[24%] left-[18%] h-1.5 w-1.5 rounded-full bg-gold/70 animate-[drift-3_16s_ease-in-out_infinite]" />
      <div className="absolute bottom-[20%] right-[12%] h-2 w-2 rounded-full bg-white/55 animate-[drift-1_22s_ease-in-out_infinite]" />

      <div
        className="absolute inset-0 opacity-[0.055] will-change-transform"
        style={{
          backgroundImage: "url('/images/world-map.svg')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
          transform: mapTransform,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-80 will-change-transform"
        style={{ transform: networkTransform }}
      >
        <svg
          viewBox="0 0 1200 700"
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="networkLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="50%" stopColor="rgba(125,211,252,0.9)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
            <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="50%" stopColor="rgba(140,200,255,0.95)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <g opacity="0.72" stroke="url(#networkLine)" strokeWidth="1" fill="none" strokeLinecap="round">
            <path d="M166 176 C242 146, 320 140, 392 182" />
            <path d="M392 182 C482 226, 532 232, 604 190" />
            <path d="M604 190 C708 142, 820 148, 930 196" />
            <path d="M392 182 C392 246, 372 324, 322 382" />
            <path d="M322 382 C304 420, 296 468, 314 548" />
            <path d="M604 190 C632 282, 620 356, 568 450" />
            <path d="M568 450 C548 492, 520 520, 476 548" />
          </g>
          <g opacity="0.9" stroke="url(#routeGlow)" strokeWidth="1.6" fill="none" strokeLinecap="round" className="animate-[glow-pulse_12s_ease-in-out_infinite]">
            <path d="M166 176 C242 146, 320 140, 392 182" />
            <path d="M392 182 C482 226, 532 232, 604 190" />
            <path d="M604 190 C708 142, 820 148, 930 196" />
            <path d="M392 182 C392 246, 372 324, 322 382" />
            <path d="M322 382 C304 420, 296 468, 314 548" />
            <path d="M604 190 C632 282, 620 356, 568 450" />
            <path d="M568 450 C548 492, 520 520, 476 548" />
          </g>
          <g className="animate-[glow-pulse_9s_ease-in-out_infinite]">
            <circle cx="166" cy="176" r="3.2" fill="#F8FAFC" />
            <circle cx="392" cy="182" r="3.4" fill="#8CC8FF" />
            <circle cx="604" cy="190" r="3.4" fill="#F8FAFC" />
            <circle cx="930" cy="196" r="3.2" fill="#8CC8FF" />
            <circle cx="322" cy="382" r="3.2" fill="#F8FAFC" />
            <circle cx="314" cy="548" r="3.2" fill="#8CC8FF" />
            <circle cx="568" cy="450" r="3.2" fill="#F8FAFC" />
            <circle cx="476" cy="548" r="3.2" fill="#8CC8FF" />
          </g>
          <g className="animate-[glow-pulse_8s_ease-in-out_infinite]">
            <circle cx="166" cy="176" r="10" fill="rgba(140,200,255,0.12)" />
            <circle cx="930" cy="196" r="10" fill="rgba(140,200,255,0.1)" />
            <circle cx="314" cy="548" r="10" fill="rgba(140,200,255,0.1)" />
            <circle cx="476" cy="548" r="10" fill="rgba(140,200,255,0.1)" />
          </g>
        </svg>
      </div>

      <div className="absolute inset-0 opacity-[0.24] will-change-transform" style={{ transform: glowTransform }}>
        <div className="absolute left-1/4 top-[18%] h-[420px] w-[420px] rounded-full bg-blue-400/10 blur-[160px]" />
        <div className="absolute bottom-[12%] right-[10%] h-[360px] w-[360px] rounded-full bg-gold/10 blur-[160px]" />
        <div className="absolute inset-0 animate-[gradient-shift_28s_ease-in-out_infinite] bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.06)_36%,transparent_66%,rgba(201,162,75,0.06)_100%)] opacity-70" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-[#02060d] to-transparent" />
    </div>
  );
}
