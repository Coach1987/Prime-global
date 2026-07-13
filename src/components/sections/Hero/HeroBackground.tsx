export function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/hero-world-map-bg.png')] bg-cover bg-center bg-no-repeat opacity-[0.3]" />

      <div className="absolute left-1/2 top-[44%] h-[44vh] w-[62vw] min-w-[260px] max-w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(82,152,255,0.22)_0%,rgba(36,95,180,0.12)_34%,rgba(7,24,48,0)_72%)] blur-3xl lg:left-[69%] rtl:lg:left-[31%]" />

      <div className="absolute left-[18%] top-[48%] h-[30vh] w-[46vw] min-w-[220px] max-w-[560px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_52%_48%,rgba(201,162,75,0.11)_0%,rgba(157,116,42,0.08)_30%,rgba(24,16,6,0)_70%)] blur-3xl lg:left-[22%] rtl:left-auto rtl:right-[18%] rtl:lg:right-[22%]" />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,6,18,0.2)_0%,rgba(1,7,20,0.52)_48%,rgba(1,8,21,0.68)_100%)]" />
      <div className="absolute inset-0 z-10 bg-[rgba(2,6,18,0.16)]" />
    </div>
  );
}
