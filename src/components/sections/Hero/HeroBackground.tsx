function WorldMapIllustration() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[7%] h-[44%] w-[min(1240px,95vw)] -translate-x-1/2 opacity-[0.26] sm:top-[6%] sm:h-[46%] sm:w-[min(1280px,93vw)] md:top-[5%] md:h-[50%] md:w-[min(1340px,91vw)]">
      <svg
        viewBox="0 0 1600 760"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="heroWorldGlow" cx="50%" cy="44%" r="56%">
            <stop offset="0%" stopColor="rgba(52,146,255,0.28)" />
            <stop offset="46%" stopColor="rgba(35,97,216,0.08)" />
            <stop offset="100%" stopColor="rgba(5,13,25,0)" />
          </radialGradient>
          <pattern id="heroMapDots" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="4.5" cy="4.5" r="1.15" fill="rgba(132,206,255,0.92)" />
          </pattern>
          <mask id="heroMapMask">
            <rect width="1600" height="760" fill="black" />
            <g fill="white">
              <path d="M100 246 L130 214 L178 184 L242 170 L310 174 L362 194 L396 226 L412 260 L404 294 L372 320 L320 332 L250 326 L194 306 L152 282 L120 268 Z M314 338 L350 326 L384 338 L410 370 L414 408 L398 448 L376 482 L350 520 L322 554 L296 538 L290 500 L298 454 L308 412 Z M458 188 L500 166 L552 158 L602 170 L628 196 L626 226 L610 252 L576 266 L534 262 L494 242 L468 218 Z M646 190 L708 164 L786 152 L882 154 L984 170 L1076 194 L1152 224 L1218 260 L1270 294 L1308 330 L1322 362 L1310 384 L1276 392 L1236 384 L1198 364 L1162 350 L1126 356 L1088 380 L1046 414 L1000 448 L950 456 L906 438 L874 414 L846 402 L812 406 L774 430 L740 458 L702 478 L662 474 L638 454 L638 426 L658 404 L684 374 L696 338 L688 308 L668 282 L648 250 Z M850 396 L880 384 L914 388 L944 408 L966 438 L974 474 L966 512 L944 550 L912 574 L876 580 L846 564 L834 526 L834 482 L842 436 Z M1128 496 L1166 486 L1208 496 L1242 520 L1260 552 L1252 578 L1220 592 L1180 590 L1144 574 L1120 546 L1114 518 Z M1276 566 L1314 556 L1354 564 L1386 586 L1404 612 L1396 634 L1366 648 L1326 646 L1290 630 L1266 604 L1260 580 Z M1404 420 L1430 408 L1460 410 L1486 424 L1504 446 L1504 468 L1484 484 L1456 488 L1428 482 L1408 466 L1398 444 Z" />
            </g>
          </mask>
          <filter id="heroMapBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.42" />
          </filter>
        </defs>

        <rect width="1600" height="760" fill="url(#heroWorldGlow)" />

        <g mask="url(#heroMapMask)">
          <rect x="46" y="110" width="1508" height="520" fill="url(#heroMapDots)" filter="url(#heroMapBlur)" />
          <rect x="46" y="110" width="1508" height="520" fill="rgba(84,170,236,0.12)" />
        </g>
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
