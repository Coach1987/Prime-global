export function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#050b16]" />
      <div className="absolute inset-0 bg-[url('/IMG_20260711_110755.jpg')] bg-[length:220%_auto] bg-[position:center_-520px] bg-no-repeat opacity-16 [filter:saturate(0)_contrast(1.1)_brightness(0.7)] sm:bg-[position:center_-650px] md:bg-[position:center_-760px] lg:bg-[position:center_-860px]" />
      <div className="absolute left-1/2 top-[40%] h-[72%] w-[94%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(5,11,22,0.98)_0%,rgba(5,11,22,0.94)_38%,rgba(5,11,22,0.5)_68%,transparent_88%)] blur-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_22%,rgba(5,11,22,0.34)_72%,rgba(5,11,22,0.6)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,transparent_20%,transparent_80%,rgba(0,0,0,0.14)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t from-[#040812] via-[#040812]/88 to-transparent" />
    </div>
  );
}
