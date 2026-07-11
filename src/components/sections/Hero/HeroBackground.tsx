function WorldMapIllustration() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[4%] h-[54%] opacity-[0.8] sm:h-[56%] md:top-[3%] md:h-[58%]">
      <svg
        viewBox="0 0 1600 820"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="heroWorldGlow" cx="50%" cy="44%" r="54%">
            <stop offset="0%" stopColor="rgba(52,146,255,0.34)" />
            <stop offset="42%" stopColor="rgba(35,97,216,0.12)" />
            <stop offset="100%" stopColor="rgba(5,13,25,0)" />
          </radialGradient>
          <pattern id="heroMapDots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="1.3" fill="rgba(135,198,255,0.68)" />
          </pattern>
          <mask id="heroMapMask">
            <rect width="1600" height="820" fill="black" />
            <g fill="white">
              <path d="M48 184 L92 130 L180 98 L270 102 L336 132 L358 176 L338 214 L262 232 L176 228 L96 214 Z" />
              <path d="M286 256 L344 236 L392 244 L430 282 L418 332 L374 372 L324 364 L288 324 Z" />
              <path d="M584 132 L688 92 L810 84 L936 102 L1040 136 L1100 180 L1088 220 L994 236 L874 228 L760 216 L658 200 Z" />
              <path d="M804 248 L866 236 L926 258 L968 312 L958 374 L912 420 L850 414 L808 360 Z" />
              <path d="M1104 226 L1168 214 L1238 224 L1308 254 L1362 298 L1342 344 L1268 364 L1194 350 L1128 314 Z" />
              <path d="M1324 316 L1388 304 L1450 318 L1502 352 L1506 392 L1464 418 L1402 424 L1348 398 L1320 360 Z" />
            </g>
          </mask>
          <filter id="heroMapBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        <rect width="1600" height="820" fill="url(#heroWorldGlow)" />

        <g mask="url(#heroMapMask)">
          <rect x="30" y="80" width="1540" height="390" fill="url(#heroMapDots)" filter="url(#heroMapBlur)" />
          <rect x="30" y="80" width="1540" height="390" fill="rgba(84,151,230,0.16)" />
        </g>

        <g fill="none" stroke="rgba(84,161,255,0.16)" strokeWidth="0.9">
          <path d="M40 170 H1560" />
          <path d="M40 226 H1560" />
          <path d="M40 282 H1560" />
          <path d="M40 338 H1560" />
          <path d="M40 394 H1560" />
          <path d="M120 92 V468" />
          <path d="M280 92 V468" />
          <path d="M440 92 V468" />
          <path d="M600 92 V468" />
          <path d="M760 92 V468" />
          <path d="M920 92 V468" />
          <path d="M1080 92 V468" />
          <path d="M1240 92 V468" />
          <path d="M1400 92 V468" />
        </g>
      </svg>
    </div>
  );
}

export function HeroBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#050b16]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_33%,rgba(39,133,255,0.62),rgba(10,22,44,0.34)_17%,rgba(5,12,24,0.95)_44%,#040812_100%),radial-gradient(circle_at_50%_33%,rgba(99,201,255,0.39),transparent_20%),radial-gradient(circle_at_50%_58%,rgba(23,86,204,0.16),transparent_30%),radial-gradient(circle_at_14%_20%,rgba(49,110,255,0.16),transparent_26%),radial-gradient(circle_at_86%_20%,rgba(81,197,255,0.14),transparent_24%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,18,35,0.06)_0%,rgba(5,10,20,0.26)_34%,rgba(4,8,16,0.95)_100%)]" />
      <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(rgba(154,200,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(154,200,255,0.12)_1px,transparent_1px)] bg-[size:74px_74px] [mask-image:linear-gradient(180deg,black_0%,rgba(0,0,0,0.96)_54%,rgba(0,0,0,0)_84%)]" />
      <div className="absolute left-1/2 top-[33%] h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2f7dff]/38 blur-[154px] sm:h-[700px] sm:w-[700px] sm:blur-[186px]" />
      <div className="absolute left-1/2 top-[30%] h-[226px] w-[226px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#66c7ff]/30 blur-[74px] sm:h-[308px] sm:w-[308px] sm:blur-[104px]" />
      <div className="absolute left-[6%] top-[18%] h-[320px] w-[320px] rounded-full bg-[#2b63ff]/12 blur-[140px] sm:h-[420px] sm:w-[420px] sm:blur-[170px]" />
      <div className="absolute right-[4%] top-[16%] h-[280px] w-[280px] rounded-full bg-[#58b9ff]/12 blur-[128px] sm:h-[380px] sm:w-[380px] sm:blur-[160px]" />
      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-[#040812] via-[#040812]/92 to-transparent" />

      <WorldMapIllustration />
    </div>
  );
}
