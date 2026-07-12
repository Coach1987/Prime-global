export function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/hero-world-map-bg.png')] bg-cover bg-center bg-no-repeat" />
      <div className="absolute inset-0 z-10 bg-[rgba(2,6,18,0.18)]" />
    </div>
  );
}
