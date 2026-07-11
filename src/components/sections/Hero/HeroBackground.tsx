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
    <div className="pointer-events-none absolute inset-0 opacity-88 sm:opacity-92">
      <svg
        viewBox="0 0 1600 820"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="heroWorldGlow" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="rgba(75,165,255,0.56)" />
            <stop offset="44%" stopColor="rgba(36,105,232,0.22)" />
            <stop offset="100%" stopColor="rgba(5,14,28,0)" />
          </radialGradient>
          <radialGradient id="heroDotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(198,230,255,0.95)" />
            <stop offset="100%" stopColor="rgba(88,164,255,0.14)" />
          </radialGradient>
          <pattern id="heroDotField" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1.8" cy="1.8" r="1" fill="rgba(105,170,245,0.22)" />
          </pattern>
          <linearGradient id="heroMapStroke" x1="0" y1="0" x2="1600" y2="820">
            <stop offset="0%" stopColor="rgba(130,190,255,0.08)" />
            <stop offset="50%" stopColor="rgba(155,210,255,0.3)" />
            <stop offset="100%" stopColor="rgba(130,190,255,0.08)" />
          </linearGradient>
        </defs>

        <rect width="1600" height="820" fill="url(#heroWorldGlow)" />
        <rect width="1600" height="820" fill="url(#heroDotField)" opacity="0.26" />
        <rect
          width="1600"
          height="820"
          fill="none"
          stroke="url(#heroMapStroke)"
          strokeWidth="0.9"
          strokeDasharray="2 14"
          opacity="0.32"
        />

        <g fill="rgba(142,204,255,0.19)">
          <circle cx="180" cy="160" r="1.1" />
          <circle cx="312" cy="214" r="1" />
          <circle cx="474" cy="196" r="1.1" />
          <circle cx="612" cy="168" r="1.1" />
          <circle cx="748" cy="226" r="1" />
          <circle cx="886" cy="174" r="1.1" />
          <circle cx="1042" cy="186" r="1.1" />
          <circle cx="1216" cy="222" r="1.1" />
          <circle cx="1386" cy="244" r="1" />
          <circle cx="1488" cy="230" r="1" />
          <circle cx="180" cy="632" r="1" />
          <circle cx="344" cy="676" r="1.1" />
          <circle cx="526" cy="648" r="1.1" />
          <circle cx="750" cy="692" r="1" />
          <circle cx="968" cy="664" r="1.1" />
          <circle cx="1150" cy="686" r="1" />
          <circle cx="1364" cy="656" r="1.1" />
          <circle cx="1518" cy="612" r="1" />
        </g>

        <g fill="#9FD5FF" stroke="url(#heroDotGlow)" strokeWidth="0.6">
          {MAP_POINTS.map(([x, y], index) => (
            <circle key={`map-dot-${index}`} cx={x} cy={y} r={1.7 + ((index + 2) % 4) * 0.16} opacity={0.42 + ((index + 1) % 5) * 0.05} />
          ))}
        </g>
      </svg>
    </div>
  );
}

export function HeroBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#040b19]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(57,156,255,0.82),rgba(12,33,76,0.62)_20%,rgba(5,14,32,0.96)_48%,#020811_100%),radial-gradient(circle_at_50%_34%,rgba(120,209,255,0.42),transparent_22%),radial-gradient(circle_at_16%_18%,rgba(59,118,255,0.32),transparent_30%),radial-gradient(circle_at_84%_20%,rgba(88,173,255,0.28),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,18,44,0.06)_0%,rgba(5,12,28,0.2)_34%,rgba(3,8,18,0.97)_100%)]" />
      <div className="absolute inset-0 opacity-[0.15] bg-[linear-gradient(rgba(167,210,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(167,210,255,0.13)_1px,transparent_1px)] bg-[size:88px_88px] [mask-image:radial-gradient(circle_at_50%_35%,black_0%,rgba(0,0,0,0.84)_54%,transparent_92%)]" />
      <div className="absolute left-1/2 top-[37%] h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3288ff]/46 blur-[186px] sm:h-[880px] sm:w-[880px] sm:blur-[240px]" />
      <div className="absolute left-1/2 top-[34%] h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7dcaff]/38 blur-[104px] sm:h-[390px] sm:w-[390px] sm:blur-[130px]" />
      <div className="absolute left-[4%] top-[18%] h-[370px] w-[370px] rounded-full bg-[#326dff]/18 blur-[168px] sm:h-[500px] sm:w-[500px] sm:blur-[194px]" />
      <div className="absolute right-[3%] top-[16%] h-[330px] w-[330px] rounded-full bg-[#5cb8ff]/18 blur-[154px] sm:h-[440px] sm:w-[440px] sm:blur-[184px]" />
      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-[#040812] via-[#040812]/92 to-transparent" />

      <WorldMapIllustration />
    </div>
  );
}
