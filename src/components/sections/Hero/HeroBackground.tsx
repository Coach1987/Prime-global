"use client";

import { useMemo } from "react";

/**
 * Deterministic pseudo-random number generator (mulberry32). Given the
 * same seed, this produces the exact same sequence every time it's
 * called — on the server during SSR and again on the client during
 * hydration. Plain `Math.random()` would produce different values in
 * each environment, causing a hydration mismatch (React would warn/error
 * that server-rendered HTML doesn't match the client render, and
 * particles would visibly jump to new positions right after page load).
 */
function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ambient background for the Hero. Layered back-to-front, each layer moving
 * at its own independent, slow speed so nothing ever feels synced/looped.
 * Pure CSS animation (see tailwind.config.ts keyframes) — no JS animation
 * loop is needed here, keeping this cheap to render continuously.
 */
export function HeroBackground() {
  // Fixed positions/sizes generated once per mount, from a deterministic
  // seed — identical on server and client, so no hydration mismatch.
  const particles = useMemo(() => {
    const random = createSeededRandom(42);
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      top: `${random() * 100}%`,
      left: `${random() * 100}%`,
      size: 2 + random() * 4,
      duration: 4 + random() * 4,
      delay: random() * 4,
      px: `${(random() - 0.5) * 60}px`,
      py: `${(random() - 0.5) * 60}px`,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Layer 1: moving gradient wash */}
      <div
        className="absolute -inset-[20%] animate-gradient-shift opacity-90"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 20%, rgba(201,162,75,0.16) 0%, transparent 60%), radial-gradient(50% 40% at 75% 70%, rgba(26,31,40,0.55) 0%, transparent 65%)",
        }}
      />

      {/* Layer 2: digital grid */}
      <div
        className="absolute inset-0 animate-grid-breathe"
        style={{
          backgroundImage:
            "linear-gradient(rgba(159,179,200,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(159,179,200,0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(60% 60% at 50% 40%, black 20%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(60% 60% at 50% 40%, black 20%, transparent 80%)",
        }}
      />

      {/* Layer 3: rotating energy circles */}
      <div className="absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 animate-spin-slow-reverse [animation-duration:90s]">
        <div className="h-full w-full rounded-full border border-accent-primary/10" />
      </div>
      <div className="absolute left-1/2 top-1/2 h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 animate-spin-slow [animation-duration:70s]">
        <div className="h-full w-full rounded-[50%] border border-metallic-2/10" style={{ transform: "scaleY(0.85)" }} />
      </div>

      {/* Layer 4: fog / atmospheric haze */}
      <div className="absolute left-[10%] top-[65%] h-72 w-72 animate-drift-1 rounded-full bg-accent-primary/[0.06] blur-[100px]" />
      <div className="absolute right-[8%] top-[20%] h-80 w-80 animate-drift-2 rounded-full bg-metallic-2/[0.05] blur-[110px]" />
      <div className="absolute left-[45%] bottom-[5%] h-64 w-64 animate-drift-3 rounded-full bg-accent-bright/[0.05] blur-[90px]" />

      {/* Layer 5: primary blue glow pool (anchors behind the globe) */}
      <div className="absolute right-[12%] top-1/2 h-[520px] w-[520px] -translate-y-1/2 animate-glow-pulse rounded-full bg-accent-primary/20 blur-[120px] md:right-[8%]" />
      {/* Secondary glow, offset corner */}
      <div className="absolute left-[6%] bottom-[10%] h-64 w-64 animate-glow-pulse rounded-full bg-accent-bright/10 blur-[100px] [animation-duration:8s]" />

      {/* Layer 6: light rays (soft, faint, from primary glow origin) */}
      <div
        className="absolute right-[10%] top-1/2 h-[700px] w-[700px] -translate-y-1/2 animate-spin-slow opacity-40 [animation-duration:140s] md:right-[6%]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(224,193,121,0.08) 8deg, transparent 20deg, transparent 160deg, rgba(224,193,121,0.06) 168deg, transparent 180deg, transparent 340deg, rgba(224,193,121,0.07) 348deg, transparent 360deg)",
          maskImage: "radial-gradient(closest-side, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(closest-side, black 40%, transparent 100%)",
        }}
      />

      {/* Layer 7: floating particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute animate-particle-float rounded-full bg-accent-bright blur-[1px]"
          style={
            {
              top: p.top,
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              "--px": p.px,
              "--py": p.py,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
