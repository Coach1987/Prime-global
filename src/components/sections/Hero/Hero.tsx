import { HeroBackground } from "./HeroBackground";
import { HeroLogoLockup } from "./HeroLogoLockup";
import { HeroContent } from "./HeroContent";
import { HeroStats } from "./HeroStats";
import { ScrollIndicator } from "./ScrollIndicator";

// Two-column layout per spec section 9: left-aligned premium messaging,
// cinematic globe on the right. Uses logical start/end ordering (not
// hardcoded left/right) so this mirrors correctly in Arabic (RTL) —
// content leads in both reading directions, logo sits on the far side.
export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[calc(100vh-88px)] items-center overflow-hidden bg-bg-primary pt-[88px]"
    >
      <HeroBackground />

      <div className="relative z-10 mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-16 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] md:gap-8 md:px-8 md:py-0">
        <div className="order-2 flex flex-col items-center text-center md:order-1 md:items-start md:text-start">
          <HeroContent />
          <HeroStats />
        </div>

        <div className="order-1 md:order-2">
          <HeroLogoLockup />
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
}
