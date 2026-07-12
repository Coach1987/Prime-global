"use client";

import Image from "next/image";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto -mt-3 flex w-full items-center justify-center px-0 sm:-mt-4 md:mt-0">
      <div className="relative aspect-[1536/1024] w-[min(78vw,646px)] max-w-[760px] sm:w-[min(72vw,595px)] md:w-[min(84vw,700px)] lg:w-[min(48vw,760px)]">
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
          className="select-none object-contain object-center"
          draggable={false}
        />

        <svg
          aria-hidden="true"
          viewBox="0 0 1536 1024"
          className="pointer-events-none absolute inset-0"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="arrowTrailCore" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E4F2FF" />
              <stop offset="55%" stopColor="#8CC8FF" />
              <stop offset="100%" stopColor="#5AA8F5" />
            </linearGradient>
            <linearGradient id="arrowTrailSoft" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(228,242,255,0)" />
              <stop offset="65%" stopColor="rgba(130,193,255,0.35)" />
              <stop offset="100%" stopColor="rgba(90,168,245,0.72)" />
            </linearGradient>
            <filter id="arrowTrailBloom" x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            id="heroArrowPath"
            d="M 586 337 C 624 217 761 176 885 214 C 979 243 1035 306 1044 381"
            fill="none"
            stroke="transparent"
            pathLength="100"
          />

          <path
            d="M 1036 357 L 1062 390 L 1020 395"
            fill="none"
            stroke="transparent"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            className="hero-arrow-trail hero-arrow-trail-soft"
            d="M 586 337 C 624 217 761 176 885 214 C 979 243 1035 306 1044 381"
            pathLength="100"
          />

          <path
            className="hero-arrow-trail hero-arrow-trail-core"
            d="M 586 337 C 624 217 761 176 885 214 C 979 243 1035 306 1044 381"
            pathLength="100"
          />

          <path
            className="hero-arrow-head-trail hero-arrow-trail-soft"
            d="M 1036 357 L 1062 390 L 1020 395"
            pathLength="100"
          />

          <path
            className="hero-arrow-head-trail hero-arrow-trail-core"
            d="M 1036 357 L 1062 390 L 1020 395"
            pathLength="100"
          />
        </svg>
      </div>

      <style jsx>{`
        .hero-arrow-trail,
        .hero-arrow-head-trail {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          animation-duration: 4.2s;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }

        .hero-arrow-trail-soft {
          stroke: url(#arrowTrailSoft);
          stroke-width: 9;
          filter: url(#arrowTrailBloom);
          stroke-dasharray: 22 78;
          animation-name: arrowTrailSweep;
          opacity: 0;
        }

        .hero-arrow-trail-core {
          stroke: url(#arrowTrailCore);
          stroke-width: 3;
          stroke-dasharray: 11 89;
          animation-name: arrowTrailSweep;
          opacity: 0;
        }

        .hero-arrow-head-trail {
          stroke-dasharray: 16 84;
          animation-name: arrowHeadSweep;
          opacity: 0;
        }

        @keyframes arrowTrailSweep {
          0% {
            stroke-dashoffset: 16;
            opacity: 0;
          }
          12% {
            opacity: 0.9;
          }
          78% {
            opacity: 0.82;
          }
          92% {
            opacity: 0.15;
          }
          100% {
            stroke-dashoffset: -108;
            opacity: 0;
          }
        }

        @keyframes arrowHeadSweep {
          0%,
          72% {
            stroke-dashoffset: 22;
            opacity: 0;
          }
          78% {
            opacity: 0.75;
          }
          94% {
            opacity: 0.28;
          }
          100% {
            stroke-dashoffset: -108;
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-arrow-trail,
          .hero-arrow-head-trail {
            animation: none;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
