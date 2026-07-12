import { HeroBackground } from "./HeroBackground";
import { HeroLogoLockup } from "./HeroLogoLockup";
import { HeroContent } from "./HeroContent";
import { ScrollIndicator } from "./ScrollIndicator";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] items-start overflow-hidden bg-bg-primary pt-[72px] sm:pt-[94px]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[url('/IMG_20260711_110755.jpg')] bg-cover bg-center bg-no-repeat"
      />

      <HeroBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-[1160px] flex-1 flex-col items-center px-4 pb-12 pt-1 sm:px-6 sm:pb-14 sm:pt-3 md:px-8 md:pt-5">
        <div className="mt-4 flex w-full justify-center sm:mt-5 md:mt-3">
          <HeroLogoLockup />
        </div>

        <div className="mt-6 flex w-full justify-center sm:mt-7 md:mt-8">
          <HeroContent />
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
}
