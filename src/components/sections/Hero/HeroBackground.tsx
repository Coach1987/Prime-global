export function HeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-[#030814]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(68,120,255,0.18),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(84,175,255,0.16),transparent_24%),linear-gradient(180deg,#030814_0%,#071221_42%,#02060d_100%)]" />

      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:72px_72px]" />

      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:220px_220px] [mask-image:linear-gradient(180deg,transparent,rgba(0,0,0,0.85),transparent)]" />

      <div className="absolute left-1/2 top-[42%] h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1d6cff]/15 blur-[180px]" />
      <div className="absolute right-[-8%] top-[16%] h-[480px] w-[480px] rounded-full bg-[#4fa3ff]/12 blur-[140px]" />
      <div className="absolute left-[-8%] top-[30%] h-[360px] w-[360px] rounded-full bg-white/6 blur-[140px]" />
      <div className="absolute inset-x-[10%] top-[10%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="absolute inset-x-[6%] top-[50%] h-[1px] -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent" />
      <div className="absolute inset-0 animate-[gradient-shift_24s_ease-in-out_infinite] bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.08)_28%,transparent_56%,rgba(201,162,75,0.07)_100%)] opacity-70" />

      <div className="absolute left-[10%] top-[22%] h-2 w-2 rounded-full bg-white/60 animate-[drift-1_18s_ease-in-out_infinite]" />
      <div className="absolute right-[16%] top-[28%] h-[6px] w-[6px] rounded-full bg-cyan-200/80 animate-[drift-2_20s_ease-in-out_infinite]" />
      <div className="absolute bottom-[24%] left-[18%] h-1.5 w-1.5 rounded-full bg-gold/70 animate-[drift-3_16s_ease-in-out_infinite]" />
      <div className="absolute bottom-[20%] right-[12%] h-2 w-2 rounded-full bg-white/55 animate-[drift-1_22s_ease-in-out_infinite]" />

      <div
        className="absolute inset-0 opacity-[0.09]"
        style={{
          backgroundImage: "url('/images/world-map.svg')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "82%",
        }}
      />

      <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-[#02060d] to-transparent" />
    </div>
  );
}
