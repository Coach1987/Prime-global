export function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#050b16]" />
      <div className="absolute inset-[-34%] -translate-y-[26%] scale-[1.35] bg-[url('/IMG_20260711_110755.jpg')] bg-cover bg-center bg-no-repeat opacity-27 [filter:saturate(0)_contrast(1.2)_brightness(0.72)]" />
      <div className="absolute left-1/2 top-[40%] h-[58%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(5,11,22,0.96)_0%,rgba(5,11,22,0.9)_34%,rgba(5,11,22,0.42)_66%,transparent_82%)] blur-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_22%,rgba(5,11,22,0.34)_72%,rgba(5,11,22,0.6)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,transparent_20%,transparent_80%,rgba(0,0,0,0.14)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t from-[#040812] via-[#040812]/88 to-transparent" />
    </div>
  );
}
