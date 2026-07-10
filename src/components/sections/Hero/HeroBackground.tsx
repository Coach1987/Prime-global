export function HeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-[#030814]"
    >
      {/* Main background */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#030814_0%,#071221_45%,#02060d_100%)]" />

      {/* World grid */}
      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Blue cinematic glow */}
      <div className="absolute left-1/2 top-[42%] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1d6cff]/15 blur-[170px]" />

      {/* Secondary blue light */}
      <div className="absolute right-[-10%] top-[20%] h-[420px] w-[420px] rounded-full bg-[#4fa3ff]/10 blur-[150px]" />

      {/* Subtle silver light */}
      <div className="absolute left-[-10%] top-[35%] h-[360px] w-[360px] rounded-full bg-white/5 blur-[140px]" />

      {/* World map */}
      <div
        className="absolute inset-0 opacity-[0.09]"
        style={{
          backgroundImage:
            "url('/images/world-map.svg')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "82%",
        }}
      />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-[#02060d] to-transparent" />
    </div>
  );
}
