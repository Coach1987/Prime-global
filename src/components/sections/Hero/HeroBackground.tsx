const MAP_POINTS = [
  [120, 234], [146, 214], [176, 192], [210, 178], [248, 170], [286, 174], [324, 188], [360, 208], [392, 232], [418, 258], [402, 286], [366, 298], [324, 292], [282, 278], [242, 260], [202, 246], [166, 238],
  [146, 312], [176, 332], [206, 360], [224, 394], [232, 432], [226, 470], [214, 506], [194, 540], [170, 566], [150, 548], [146, 516], [154, 480], [164, 444], [170, 408], [170, 368],
  [572, 180], [614, 166], [660, 162], [704, 170], [742, 184], [770, 206], [780, 232], [764, 258], [726, 270], [684, 264], [644, 248], [606, 224], [580, 202],
  [604, 286], [632, 312], [652, 342], [662, 376], [658, 412], [646, 448], [630, 484], [606, 514], [578, 538], [550, 516], [540, 476], [544, 438], [552, 402], [560, 366], [568, 330],
  [896, 180], [944, 166], [992, 162], [1040, 166], [1088, 176], [1138, 194], [1184, 218], [1230, 238], [1280, 250], [1330, 256], [1380, 252], [1430, 242], [1480, 228], [1520, 214], [1550, 196],
  [1102, 286], [1140, 306], [1172, 330], [1200, 360], [1222, 394], [1234, 430], [1232, 468], [1218, 504], [1198, 536], [1170, 564], [1142, 544], [1128, 506], [1124, 468], [1128, 430], [1134, 392], [1140, 356],
  [1372, 292], [1418, 312], [1458, 338], [1488, 368], [1498, 402], [1488, 436], [1460, 466], [1420, 486], [1378, 494], [1342, 486], [1322, 462], [1318, 432], [1322, 398], [1334, 366],
  [1464, 546], [1504, 530], [1540, 536], [1560, 560], [1550, 586], [1518, 596], [1480, 592], [1450, 578], [1434, 560],
] as const;

function WorldMapIllustration() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[6%] h-[68%] opacity-80 sm:h-[70%] md:top-[4%] md:h-[72%]">
      <svg
        viewBox="0 0 1600 820"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="heroWorldGlow" cx="50%" cy="44%" r="54%">
            <stop offset="0%" stopColor="rgba(50,144,255,0.42)" />
            <stop offset="42%" stopColor="rgba(33,94,214,0.16)" />
            <stop offset="100%" stopColor="rgba(5,13,25,0)" />
          </radialGradient>
          <radialGradient id="heroDotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(178,224,255,0.95)" />
            <stop offset="100%" stopColor="rgba(84,165,255,0.12)" />
          </radialGradient>
        </defs>

        <rect width="1600" height="820" fill="url(#heroWorldGlow)" />

        <g fill="rgba(123,192,255,0.2)">
          <circle cx="220" cy="178" r="1.4" />
          <circle cx="342" cy="232" r="1.2" />
          <circle cx="594" cy="170" r="1.4" />
          <circle cx="734" cy="232" r="1.2" />
          <circle cx="910" cy="176" r="1.3" />
          <circle cx="1216" cy="226" r="1.4" />
          <circle cx="1400" cy="252" r="1.2" />
        </g>

        <g fill="#9FD5FF" stroke="url(#heroDotGlow)" strokeWidth="0.6">
          {MAP_POINTS.map(([x, y], index) => (
            <circle key={`map-dot-${index}`} cx={x} cy={y} r={1.85 + ((index + 2) % 4) * 0.18} opacity={0.55 + ((index + 1) % 5) * 0.06} />
          ))}
        </g>

        <g fill="none" stroke="rgba(76,153,255,0.12)" strokeWidth="1">
          <path d="M104 216 C214 156 348 154 446 210" />
          <path d="M552 186 C640 142 760 146 842 188" />
          <path d="M872 182 C986 142 1110 146 1228 196" />
          <path d="M1268 236 C1380 204 1480 208 1568 170" />
          <path d="M174 378 C292 360 408 370 522 420" />
          <path d="M592 330 C702 300 822 302 934 348" />
          <path d="M1014 332 C1136 310 1254 318 1378 362" />
          <path d="M1428 392 C1490 402 1544 424 1588 458" />
        </g>
      </svg>
    </div>
  );
}

export function HeroBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#050b16]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(35,128,255,0.62),rgba(10,22,44,0.34)_18%,rgba(5,12,24,0.96)_44%,#040812_100%),radial-gradient(circle_at_50%_36%,rgba(86,188,255,0.42),transparent_22%),radial-gradient(circle_at_14%_20%,rgba(49,110,255,0.18),transparent_26%),radial-gradient(circle_at_86%_20%,rgba(81,197,255,0.16),transparent_24%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,18,35,0.15)_0%,rgba(5,10,20,0.34)_34%,rgba(4,8,16,0.96)_100%)]" />
      <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(154,200,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(154,200,255,0.12)_1px,transparent_1px)] bg-[size:96px_96px] [mask-image:radial-gradient(circle_at_50%_36%,black_0%,rgba(0,0,0,0.8)_40%,transparent_78%)]" />
      <div className="absolute left-1/2 top-[37%] h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2f7dff]/34 blur-[150px] sm:h-[720px] sm:w-[720px] sm:blur-[190px]" />
      <div className="absolute left-1/2 top-[33%] h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#66c7ff]/28 blur-[78px] sm:h-[320px] sm:w-[320px] sm:blur-[110px]" />
      <div className="absolute left-[6%] top-[18%] h-[320px] w-[320px] rounded-full bg-[#2b63ff]/12 blur-[140px] sm:h-[420px] sm:w-[420px] sm:blur-[170px]" />
      <div className="absolute right-[4%] top-[16%] h-[280px] w-[280px] rounded-full bg-[#58b9ff]/12 blur-[128px] sm:h-[380px] sm:w-[380px] sm:blur-[160px]" />
      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-[#040812] via-[#040812]/92 to-transparent" />

      <WorldMapIllustration />
    </div>
  );
}
