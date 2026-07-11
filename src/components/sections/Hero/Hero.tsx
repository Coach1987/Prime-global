import { HeroBackground } from "./HeroBackground";
import { HeroLogoLockup } from "./HeroLogoLockup";
import { HeroContent } from "./HeroContent";
import { HeroStats } from "./HeroStats";
import { ScrollIndicator } from "./ScrollIndicator";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[calc(100vh-72px)] items-center overflow-hidden bg-bg-primary pt-[76px] sm:min-h-[calc(100vh-88px)] sm:pt-[88px]"
    >
      <HeroBackground />

      <div className="relative z-10 mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-8 px-5 py-10 sm:gap-12 sm:px-6 md:grid-cols-[1.08fr_0.92fr] md:gap-10 md:px-8 md:py-0 lg:gap-12">
        <div className="order-2 -mt-16 flex flex-col items-center text-center md:order-1 md:mt-0 md:items-start md:text-start">
          <HeroContent />
          <HeroStats />
        </div>

        <div className="order-1 flex items-center justify-center md:order-2">
          <HeroLogoLockup />
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
}
