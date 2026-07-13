"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

const ORBIT_LAYERS = [
  {
    id: "outer",
    rx: 45,
    ry: 16,
    tilt: -13,
    duration: 56,
    dash: "0.32 14.8",
    baseStroke: "rgba(160, 196, 255, 0.2)",
    particleStroke: "rgba(227, 240, 255, 0.86)",
    glowStroke: "rgba(127, 172, 242, 0.28)",
  },
  {
    id: "mid",
    rx: 40.5,
    ry: 14,
    tilt: 7,
    duration: 48,
    dash: "0.3 13",
    baseStroke: "rgba(151, 190, 255, 0.2)",
    particleStroke: "rgba(226, 239, 255, 0.84)",
    glowStroke: "rgba(128, 179, 255, 0.31)",
  },
  {
    id: "inner",
    rx: 36,
    ry: 12,
    tilt: -4,
    duration: 42,
    dash: "0.27 11.8",
    baseStroke: "rgba(149, 186, 245, 0.19)",
    particleStroke: "rgba(218, 233, 255, 0.82)",
    glowStroke: "rgba(119, 162, 235, 0.27)",
  },
  {
    id: "core",
    rx: 32,
    ry: 10.8,
    tilt: 11,
    duration: 38,
    dash: "0.24 10.6",
    baseStroke: "rgba(144, 180, 238, 0.16)",
    particleStroke: "rgba(209, 227, 252, 0.76)",
    glowStroke: "rgba(109, 148, 218, 0.24)",
  },
] as const;

export function HeroLogoLockup() {
  const lockupRef = useRef<HTMLDivElement>(null);
  const depthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lockupEl = lockupRef.current;
    const depthEl = depthRef.current;

    if (!lockupEl || !depthEl) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopPointer = window.matchMedia("(pointer:fine) and (min-width: 1024px)");

    let frameId = 0;
    let floatFrame = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const applyDepth = () => {
      currentX += (targetX - currentX) * 0.1;
      currentY += (targetY - currentY) * 0.1;

      depthEl.style.setProperty("--hero-depth-x", `${currentX.toFixed(2)}px`);
      depthEl.style.setProperty("--hero-depth-y", `${currentY.toFixed(2)}px`);

      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        frameId = window.requestAnimationFrame(applyDepth);
      } else {
        frameId = 0;
      }
    };

    const scheduleDepth = () => {
      if (frameId) {
        return;
      }
      frameId = window.requestAnimationFrame(applyDepth);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reduceMotion.matches || !desktopPointer.matches) {
        return;
      }

      const rect = lockupEl.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      targetX = nx * 6;
      targetY = ny * 4;
      scheduleDepth();
    };

    const resetDepth = () => {
      targetX = 0;
      targetY = 0;
      scheduleDepth();
    };

    const runMobileFloat = (time: number) => {
      if (reduceMotion.matches || desktopPointer.matches) {
        return;
      }

      const t = time * 0.001;
      targetX = Math.sin(t * 0.32) * 2.2;
      targetY = Math.cos(t * 0.26) * 1.8;
      scheduleDepth();
      floatFrame = window.requestAnimationFrame(runMobileFloat);
    };

    const stopMobileFloat = () => {
      if (floatFrame) {
        window.cancelAnimationFrame(floatFrame);
      }
      floatFrame = 0;
    };

    const syncMotionMode = () => {
      resetDepth();
      stopMobileFloat();

      if (!reduceMotion.matches && !desktopPointer.matches) {
        floatFrame = window.requestAnimationFrame(runMobileFloat);
      }
    };

    lockupEl.addEventListener("pointermove", onPointerMove);
    lockupEl.addEventListener("pointerleave", resetDepth);
    reduceMotion.addEventListener("change", syncMotionMode);
    desktopPointer.addEventListener("change", syncMotionMode);

    syncMotionMode();

    return () => {
      lockupEl.removeEventListener("pointermove", onPointerMove);
      lockupEl.removeEventListener("pointerleave", resetDepth);
      reduceMotion.removeEventListener("change", syncMotionMode);
      desktopPointer.removeEventListener("change", syncMotionMode);

      stopMobileFloat();

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div className="relative mx-auto -mt-3 flex w-full items-center justify-center px-0 sm:-mt-4 md:mt-0">
      <div ref={lockupRef} className="relative aspect-[1536/1024] w-[min(78vw,646px)] max-w-[760px] sm:w-[min(72vw,595px)] md:w-[min(74vw,610px)] lg:w-[min(48vw,760px)]">
        <div ref={depthRef} className="hero-depth-shell relative h-full w-full">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[25%] z-[6] h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_40%_42%,rgba(118,176,255,0.22)_0%,rgba(63,118,200,0.11)_38%,rgba(9,26,46,0)_70%)] blur-3xl md:top-[28%] md:h-[38%] md:w-[38%]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[64%] top-[28%] z-[6] h-[22%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_52%_48%,rgba(207,169,84,0.14)_0%,rgba(129,94,37,0.08)_38%,rgba(20,12,3,0)_74%)] blur-3xl md:h-[24%] md:w-[26%]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[25.8%] z-[9] h-[27%] w-[50%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(2,9,19,0.08)_0%,rgba(2,9,19,0.16)_50%,rgba(2,9,19,0.22)_75%,rgba(2,9,19,0)_100%)] md:top-[28.8%] md:h-[29%]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[24.6%] z-10 h-[31%] w-[52%] -translate-x-1/2 -translate-y-1/2 sm:h-[32%] sm:w-[56%] md:top-[28%] md:h-[34%] md:w-[60%]"
          >
            <svg viewBox="0 0 100 100" className="h-full w-full">
              {ORBIT_LAYERS.map((layer, index) => (
                <g key={layer.id} transform={`rotate(${layer.tilt} 50 50)`}>
                  <ellipse
                    className="hero-orbit-track"
                    cx="50"
                    cy="50"
                    rx={layer.rx}
                    ry={layer.ry}
                    fill="none"
                    stroke={layer.baseStroke}
                    strokeWidth="0.22"
                  />

                  <ellipse
                    className="hero-orbit-particles"
                    style={{
                      animationDuration: `${layer.duration}s`,
                      animationDelay: `${-index * 6.4}s`,
                    }}
                    cx="50"
                    cy="50"
                    rx={layer.rx}
                    ry={layer.ry}
                    fill="none"
                    stroke={layer.particleStroke}
                    strokeWidth="0.86"
                    strokeLinecap="round"
                    strokeDasharray={layer.dash}
                  />

                  <ellipse
                    className="hero-orbit-glow"
                    style={{
                      animationDuration: `${layer.duration * 1.3}s`,
                      animationDelay: `${-index * 4.3}s`,
                    }}
                    cx="50"
                    cy="50"
                    rx={layer.rx}
                    ry={layer.ry}
                    fill="none"
                    stroke={layer.glowStroke}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeDasharray={layer.dash}
                  />

                  <ellipse
                    className="hero-orbit-spark"
                    style={{
                      animationDuration: `${layer.duration * 2.15}s`,
                      animationDelay: `${-index * 3.8}s`,
                    }}
                    cx="50"
                    cy="50"
                    rx={layer.rx}
                    ry={layer.ry}
                    fill="none"
                    stroke="rgba(239, 247, 255, 0.72)"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                    strokeDasharray="0.22 28.5"
                  />
                </g>
              ))}
            </svg>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[24.5%] z-[11] h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/10 blur-3xl md:top-[28.5%] md:h-[33%] md:w-[33%]"
          />

          <Image
            src="/images/logo/prime-global-logo-clean.png"
            alt="Prime Global"
            fill
            priority
            sizes="(min-width: 1280px) 760px, (min-width: 1024px) 48vw, (min-width: 768px) 84vw, (min-width: 640px) 72vw, 78vw"
            className="relative z-20 select-none object-contain object-center drop-shadow-[0_24px_58px_rgba(2,11,28,0.48)]"
            draggable={false}
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[34%] z-[8] h-[20%] w-[50%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(1,9,24,0.48)_0%,rgba(1,9,24,0.2)_48%,rgba(1,9,24,0)_84%)] blur-2xl md:top-[37%]"
          />
        </div>
      </div>
    </div>
  );
}
