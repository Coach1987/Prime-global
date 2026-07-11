function WorldMapIllustration() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[9%] h-[40%] w-[min(1500px,98vw)] -translate-x-1/2 opacity-[0.12] sm:top-[8%] sm:h-[42%] md:top-[7%] md:h-[45%]">
      <svg
        viewBox="0 0 1600 760"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="heroWorldMapGlow" cx="50%" cy="50%" r="58%">
            <stop offset="0%" stopColor="rgba(167,186,206,0.26)" />
            <stop offset="48%" stopColor="rgba(122,150,176,0.1)" />
            <stop offset="100%" stopColor="rgba(7,14,24,0)" />
          </radialGradient>
          <pattern id="heroWorldMapDots" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="4.5" cy="4.5" r="0.84" fill="rgba(178,197,217,0.88)" />
          </pattern>
          <mask id="heroWorldMapMask">
            <rect width="1600" height="760" fill="black" />
            <g fill="white">
              <path d="M118 242 L160 210 L214 186 L286 176 L350 184 L406 204 L446 230 L452 258 L420 282 L360 298 L286 300 L224 288 L168 268 L128 252 Z" />
              <path d="M318 312 L344 332 L360 366 L360 404 L348 444 L330 486 L310 530 L288 570 L262 602 L238 592 L234 554 L244 504 L262 454 L284 406 L304 360 Z" />
              <path d="M580 192 L602 178 L628 176 L654 184 L656 204 L634 216 L606 216 L584 208 Z" />
              <path d="M650 220 L686 200 L732 190 L786 190 L848 198 L906 214 L954 236 L990 260 L998 286 L966 302 L922 302 L884 292 L850 292 L816 304 L786 328 L760 350 L732 368 L700 376 L672 366 L656 342 L648 310 Z" />
              <path d="M700 350 L730 362 L754 390 L764 428 L760 470 L750 512 L734 556 L712 598 L684 632 L656 626 L644 590 L648 544 L662 496 L680 450 L694 408 Z" />
              <path d="M936 322 L962 312 L990 312 L1016 324 L1032 344 L1034 368 L1014 384 L984 386 L956 376 L938 356 Z" />
              <path d="M1082 506 L1108 496 L1138 500 L1158 518 L1156 546 L1132 558 L1102 552 L1082 532 Z" />
              <path d="M1210 562 L1244 550 L1286 552 L1324 568 L1358 592 L1378 620 L1372 644 L1338 652 L1296 648 L1258 634 L1228 610 L1208 582 Z" />
            </g>
          </mask>
          <filter id="heroWorldMapSoften" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.16" />
          </filter>
        </defs>

        <rect width="1600" height="760" fill="url(#heroWorldMapGlow)" />

        <g mask="url(#heroWorldMapMask)">
          <rect x="60" y="120" width="1480" height="520" fill="url(#heroWorldMapDots)" filter="url(#heroWorldMapSoften)" />
          <rect x="60" y="120" width="1480" height="520" fill="rgba(154,174,194,0.2)" />
        </g>

        <path
          d="M118 242 L160 210 L214 186 L286 176 L350 184 L406 204 L446 230 L452 258 L420 282 L360 298 L286 300 L224 288 L168 268 L128 252 Z M318 312 L344 332 L360 366 L360 404 L348 444 L330 486 L310 530 L288 570 L262 602 L238 592 L234 554 L244 504 L262 454 L284 406 L304 360 Z M580 192 L602 178 L628 176 L654 184 L656 204 L634 216 L606 216 L584 208 Z M650 220 L686 200 L732 190 L786 190 L848 198 L906 214 L954 236 L990 260 L998 286 L966 302 L922 302 L884 292 L850 292 L816 304 L786 328 L760 350 L732 368 L700 376 L672 366 L656 342 L648 310 Z M700 350 L730 362 L754 390 L764 428 L760 470 L750 512 L734 556 L712 598 L684 632 L656 626 L644 590 L648 544 L662 496 L680 450 L694 408 Z M936 322 L962 312 L990 312 L1016 324 L1032 344 L1034 368 L1014 384 L984 386 L956 376 L938 356 Z M1082 506 L1108 496 L1138 500 L1158 518 L1156 546 L1132 558 L1102 552 L1082 532 Z M1210 562 L1244 550 L1286 552 L1324 568 L1358 592 L1378 620 L1372 644 L1338 652 L1296 648 L1258 634 L1228 610 L1208 582 Z"
          fill="none"
          stroke="rgba(179,197,218,0.82)"
          strokeWidth="1.08"
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
