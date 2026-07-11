function WorldMapIllustration() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[7%] h-[44%] w-[min(1480px,98vw)] -translate-x-1/2 opacity-[0.1] sm:top-[6%] sm:h-[46%] md:top-[5%] md:h-[50%]">
      <svg
        viewBox="0 0 1600 760"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="heroWorldMapGlow" cx="50%" cy="46%" r="58%">
            <stop offset="0%" stopColor="rgba(168,186,205,0.22)" />
            <stop offset="48%" stopColor="rgba(118,150,178,0.08)" />
            <stop offset="100%" stopColor="rgba(7,14,24,0)" />
          </radialGradient>
          <pattern id="heroWorldMapDots" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="4.5" cy="4.5" r="0.82" fill="rgba(174,194,216,0.82)" />
          </pattern>
          <mask id="heroWorldMapMask">
            <rect width="1600" height="760" fill="black" />
            <g fill="white">
              <path d="M140 230 L176 200 L230 175 L292 168 L350 176 L404 196 L438 226 L424 256 L374 278 L316 286 L252 278 L196 262 L152 246 Z" />
              <path d="M316 294 L346 310 L362 338 L356 374 L338 410 L320 448 L304 492 L286 540 L266 568 L248 550 L248 510 L258 462 L270 418 L286 376 L300 338 Z" />
              <path d="M596 188 L620 172 L650 170 L670 182 L666 202 L644 214 L612 212 L592 202 Z" />
              <path d="M654 214 L690 194 L740 186 L788 188 L836 196 L878 210 L916 230 L946 252 L934 274 L896 276 L864 266 L834 266 L804 278 L780 302 L758 324 L736 344 L710 350 L684 344 L668 324 L662 296 L650 268 Z" />
              <path d="M702 330 L730 340 L754 364 L762 396 L758 436 L750 476 L736 520 L714 560 L684 590 L658 582 L648 554 L652 514 L664 468 L680 422 L690 384 Z" />
              <path d="M948 306 L980 304 L1010 316 L1032 338 L1034 364 L1014 378 L982 380 L956 366 L940 344 Z" />
              <path d="M1082 496 L1114 486 L1142 494 L1160 514 L1156 540 L1128 548 L1098 536 L1082 516 Z" />
              <path d="M1218 548 L1254 538 L1290 544 L1324 560 L1352 582 L1370 604 L1360 624 L1326 628 L1288 622 L1254 606 L1228 582 L1214 562 Z" />
            </g>
          </mask>
          <filter id="heroWorldMapSoften" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.16" />
          </filter>
        </defs>

        <rect width="1600" height="760" fill="url(#heroWorldMapGlow)" />

        <g mask="url(#heroWorldMapMask)">
          <rect x="60" y="120" width="1480" height="520" fill="url(#heroWorldMapDots)" filter="url(#heroWorldMapSoften)" />
          <rect x="60" y="120" width="1480" height="520" fill="rgba(156,176,198,0.15)" />
        </g>

        <path
          d="M140 230 L176 200 L230 175 L292 168 L350 176 L404 196 L438 226 L424 256 L374 278 L316 286 L252 278 L196 262 L152 246 Z M316 294 L346 310 L362 338 L356 374 L338 410 L320 448 L304 492 L286 540 L266 568 L248 550 L248 510 L258 462 L270 418 L286 376 L300 338 Z M596 188 L620 172 L650 170 L670 182 L666 202 L644 214 L612 212 L592 202 Z M654 214 L690 194 L740 186 L788 188 L836 196 L878 210 L916 230 L946 252 L934 274 L896 276 L864 266 L834 266 L804 278 L780 302 L758 324 L736 344 L710 350 L684 344 L668 324 L662 296 L650 268 Z M702 330 L730 340 L754 364 L762 396 L758 436 L750 476 L736 520 L714 560 L684 590 L658 582 L648 554 L652 514 L664 468 L680 422 L690 384 Z M948 306 L980 304 L1010 316 L1032 338 L1034 364 L1014 378 L982 380 L956 366 L940 344 Z M1082 496 L1114 486 L1142 494 L1160 514 L1156 540 L1128 548 L1098 536 L1082 516 Z M1218 548 L1254 538 L1290 544 L1324 560 L1352 582 L1370 604 L1360 624 L1326 628 L1288 622 L1254 606 L1228 582 L1214 562 Z"
          fill="none"
          stroke="rgba(169,190,212,0.65)"
          strokeWidth="1.04"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function HeroBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#050b16]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_33%,rgba(39,133,255,0.72),rgba(10,22,44,0.34)_17%,rgba(5,12,24,0.95)_44%,#040812_100%),radial-gradient(circle_at_50%_33%,rgba(99,201,255,0.46),transparent_21%),radial-gradient(circle_at_50%_58%,rgba(23,86,204,0.16),transparent_30%),radial-gradient(circle_at_14%_20%,rgba(49,110,255,0.16),transparent_26%),radial-gradient(circle_at_86%_20%,rgba(81,197,255,0.14),transparent_24%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,18,35,0.06)_0%,rgba(5,10,20,0.26)_34%,rgba(4,8,16,0.95)_100%)]" />
      <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(rgba(154,200,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(154,200,255,0.12)_1px,transparent_1px)] bg-[size:74px_74px] [mask-image:linear-gradient(180deg,black_0%,rgba(0,0,0,0.96)_54%,rgba(0,0,0,0)_84%)]" />
      <div className="absolute left-1/2 top-[33%] h-[704px] w-[704px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2f7dff]/44 blur-[182px] sm:h-[878px] sm:w-[878px] sm:blur-[218px]" />
      <div className="absolute left-1/2 top-[30%] h-[284px] w-[284px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#66c7ff]/35 blur-[92px] sm:h-[386px] sm:w-[386px] sm:blur-[126px]" />
      <div className="absolute left-[6%] top-[18%] h-[320px] w-[320px] rounded-full bg-[#2b63ff]/12 blur-[140px] sm:h-[420px] sm:w-[420px] sm:blur-[170px]" />
      <div className="absolute right-[4%] top-[16%] h-[280px] w-[280px] rounded-full bg-[#58b9ff]/12 blur-[128px] sm:h-[380px] sm:w-[380px] sm:blur-[160px]" />
      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-[#040812] via-[#040812]/92 to-transparent" />

      <WorldMapIllustration />
    </div>
  );
}
