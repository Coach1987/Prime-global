import { HeroBackground } from "./HeroBackground";
import { HeroLogoLockup } from "./HeroLogoLockup";
import { HeroContent } from "./HeroContent";
import { ScrollIndicator } from "./ScrollIndicator";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] items-start bg-bg-primary pt-[68px] sm:pt-[92px]"
    >
      <HeroBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center px-4 pb-12 pt-1 sm:px-6 sm:pb-14 sm:pt-4 md:px-8 md:pt-6">
        <div className="mt-8 flex w-full justify-center sm:mt-6 md:mt-4">
          <HeroLogoLockup />
        </div>

        <div className="mt-10 flex w-full justify-center sm:mt-10 md:mt-10">
          <HeroContent />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-px bg-gradient-to-r from-transparent via-blue-300/25 to-transparent" />
      <ScrollIndicator />
    </section>
  );
}
