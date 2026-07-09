export function HeroBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#050911]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(201,162,75,0.18),transparent_28%),radial-gradient(circle_at_80%_45%,rgba(40,90,130,0.20),transparent_32%),linear-gradient(180deg,#050911_0%,#07111c_55%,#03060b_100%)]" />

      <div className="absolute inset-0 opacity-[0.16] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:54px_54px]" />

      <div className="absolute left-[-20%] top-[10%] h-[520px] w-[520px] rounded-full bg-[#c9a24b]/20 blur-[120px]" />
      <div className="absolute right-[-25%] top-[25%] h-[560px] w-[560px] rounded-full bg-[#1d5f8f]/20 blur-[130px]" />

      <div className="absolute left-1/2 top-[42%] h-[420px] w-[900px] -translate-x-1/2 rounded-full border border-[#c9a24b]/20 rotate-[-12deg]" />
      <div className="absolute left-1/2 top-[45%] h-[520px] w-[1050px] -translate-x-1/2 rounded-full border border-[#c9a24b]/10 rotate-[10deg]" />

      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#03060b] to-transparent" />
    </div>
  );
}
