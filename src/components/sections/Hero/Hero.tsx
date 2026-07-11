import { HeroBackground } from "./HeroBackground";
import { HeroLogoLockup } from "./HeroLogoLockup";
import { HeroContent } from "./HeroContent";
import { ScrollIndicator } from "./ScrollIndicator";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-bg-primary pt-[84px] sm:min-h-[calc(100vh-88px)] sm:pt-[92px]"
    >
      <HeroBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 flex-col items-center justify-center px-4 pb-14 pt-6 sm:px-6 sm:pb-18 sm:pt-8 md:px-8 md:pt-10 lg:pt-12">
        <div className="flex w-full justify-center">
          <HeroLogoLockup />
        </div>

        <div className="mt-2 flex w-full justify-center sm:mt-4 md:mt-5">
          <HeroContent />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-px bg-gradient-to-r from-transparent via-blue-300/25 to-transparent" />
      <ScrollIndicator />
    </section>
  );
}
