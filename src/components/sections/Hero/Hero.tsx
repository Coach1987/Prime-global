import { HeroBackground } from "./HeroBackground";
import { HeroLogoLockup } from "./HeroLogoLockup";
import { HeroContent } from "./HeroContent";
import { ScrollIndicator } from "./ScrollIndicator";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] items-start bg-bg-primary pt-[72px] sm:pt-[92px]"
    >
      <HeroBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center px-4 pb-12 pt-3 sm:px-6 sm:pb-14 sm:pt-6 md:px-8 md:pt-8">
        <div className="flex w-full justify-center">
          <HeroLogoLockup />
        </div>

        <div className="-mt-1 flex w-full justify-center sm:mt-0 md:mt-1">
          <HeroContent />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-px bg-gradient-to-r from-transparent via-blue-300/25 to-transparent" />
      <ScrollIndicator />
    </section>
  );
}
