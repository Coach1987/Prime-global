"use client";

import Image from "next/image";

const ORBIT_LAYERS = [
  {
    id: "outer",
    rx: 45,
    ry: 16,
    tilt: -13,
    duration: 56,
    dash: "0.35 13.5",
  },
  {
    id: "mid",
    rx: 40.5,
    ry: 14,
    tilt: 7,
    duration: 48,
    dash: "0.32 12.2",
  },
  {
    id: "inner",
    rx: 36,
    ry: 12,
    tilt: -4,
    duration: 42,
    dash: "0.28 11.3",
  },
] as const;

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto -mt-3 flex w-full items-center justify-center px-0 sm:-mt-4 md:mt-0">
      <div className="relative aspect-[1536/1024] w-[min(78vw,646px)] max-w-[760px] sm:w-[min(72vw,595px)] md:w-[min(84vw,700px)] lg:w-[min(48vw,760px)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[25%] z-10 h-[31%] w-[54%] -translate-x-1/2 -translate-y-1/2 sm:h-[32%] sm:w-[58%] md:top-[28%] md:h-[34%] md:w-[62%]"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full">
            {ORBIT_LAYERS.map((layer, index) => (
              <g key={layer.id} transform={`rotate(${layer.tilt} 50 50)`}>
                <ellipse
                  cx="50"
                  cy="50"
                  rx={layer.rx}
                  ry={layer.ry}
                  fill="none"
                  stroke="rgba(153, 188, 255, 0.18)"
                  strokeWidth="0.24"
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
                  stroke="rgba(220, 237, 255, 0.95)"
                  strokeWidth="0.92"
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
                  stroke="rgba(134, 183, 255, 0.33)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeDasharray={layer.dash}
                />
              </g>
            ))}
          </svg>
        </div>

        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[24.5%] h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/12 blur-3xl md:top-[28.5%] md:h-[34%] md:w-[34%]"
        />

        <Image
          src="/images/logo/prime-global-logo-clean.png"
          alt="Prime Global"
          fill
          priority
          sizes="(min-width: 1280px) 760px, (min-width: 1024px) 48vw, (min-width: 768px) 84vw, (min-width: 640px) 72vw, 78vw"
          className="relative z-20 select-none object-contain object-center"
          draggable={false}
        />
      </div>
    </div>
  );
}
