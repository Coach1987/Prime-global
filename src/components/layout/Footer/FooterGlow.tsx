export function FooterGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Single soft glow, top-center — quiet ambient light, not a repeat of the Hero's layered atmosphere */}
      <div className="absolute left-1/2 top-0 h-[280px] w-[600px] -translate-x-1/2 -translate-y-1/2 animate-glow-pulse rounded-full bg-accent-primary/[0.08] blur-[100px] [animation-duration:8s]" />
      {/* Faint top hairline, gradient-lit at the center to echo the glow above it */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}
