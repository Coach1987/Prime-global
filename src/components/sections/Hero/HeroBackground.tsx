export function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(26,52,86,0.28)_0%,rgba(6,14,28,0.1)_36%,rgba(2,6,18,0)_72%)]" />

      <div className="absolute inset-0 bg-[url('/hero-world-map-bg.png')] bg-cover bg-center bg-no-repeat opacity-[0.54] contrast-[1.08] saturate-[0.9]" />

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(88,130,176,0.12)_0%,rgba(114,154,196,0.04)_35%,rgba(90,128,170,0.1)_100%)]" />

      <div className="absolute left-1/2 top-[43%] h-[42vh] w-[60vw] min-w-[250px] max-w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_50%_44%,rgba(103,168,242,0.18)_0%,rgba(55,113,188,0.12)_32%,rgba(7,24,48,0.04)_58%,rgba(7,24,48,0)_76%)] blur-2xl lg:left-[68%] rtl:lg:left-[32%]" />

      <div className="absolute left-1/2 top-[32%] h-[24vh] w-[30vw] min-w-[180px] max-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(138,193,255,0.16)_0%,rgba(49,99,171,0.08)_46%,rgba(6,18,36,0)_78%)] lg:left-[61%] rtl:lg:left-[39%]" />

      <div className="absolute left-[18%] top-[47%] h-[24vh] w-[34vw] min-w-[180px] max-w-[400px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_54%_48%,rgba(203,166,88,0.14)_0%,rgba(151,115,48,0.08)_34%,rgba(24,16,6,0)_72%)] blur-2xl lg:left-[20%] rtl:left-auto rtl:right-[18%] rtl:lg:right-[20%]" />

      <div className="absolute left-[28%] top-[20%] h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(222,194,125,0.2)_0%,rgba(222,194,125,0.06)_40%,rgba(222,194,125,0)_72%)]" />
      <div className="absolute left-[72%] top-[24%] h-16 w-16 rounded-full bg-[radial-gradient(circle,rgba(146,196,255,0.16)_0%,rgba(146,196,255,0.05)_44%,rgba(146,196,255,0)_74%)]" />
      <div className="absolute left-[64%] top-[58%] h-12 w-12 rounded-full bg-[radial-gradient(circle,rgba(205,223,248,0.16)_0%,rgba(205,223,248,0.05)_42%,rgba(205,223,248,0)_76%)]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(4,12,24,0)_0%,rgba(4,12,24,0.16)_44%,rgba(2,7,18,0.38)_72%,rgba(1,4,12,0.72)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,6,18,0.18)_0%,rgba(1,7,20,0.4)_46%,rgba(1,8,21,0.56)_100%)]" />
      <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(1,4,12,0.5)_0%,rgba(1,4,12,0.08)_24%,rgba(1,4,12,0.08)_76%,rgba(1,4,12,0.52)_100%)]" />
    </div>
  );
}
