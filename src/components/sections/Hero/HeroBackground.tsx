export function HeroBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#050b16]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(54,114,201,0.18),transparent_30%),linear-gradient(180deg,#07101d_0%,#050b16_38%,#040812_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,transparent_20%,transparent_80%,rgba(0,0,0,0.14)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t from-[#040812] via-[#040812]/88 to-transparent" />
    </div>
  );
}
