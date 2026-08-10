import { HeroBackground } from "./HeroBackground";
import { HeroLogoLockup } from "./HeroLogoLockup";
import { HeroContent } from "./HeroContent";
import { ScrollIndicator } from "./ScrollIndicator";
import { HeroGatewayLayer } from "./HeroGatewayLayer";

export function Hero() {
  return (
    <section
      id="hero"
      data-hero-root
      className="relative min-h-[128svh] w-full overflow-x-clip bg-bg-primary lg:min-h-[165svh]"
    >
      <div className="sticky top-0 flex h-[100svh] w-full items-start overflow-hidden pt-[72px] sm:pt-[94px]">
        <HeroBackground />
        <HeroGatewayLayer />

        <div className="relative z-20 mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-4 pb-12 pt-1 sm:px-6 sm:pb-14 sm:pt-3 md:px-8 md:pt-5">
          <div className="mt-4 grid w-full items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,760px)] lg:items-start lg:gap-8 rtl:lg:grid-cols-[minmax(0,760px)_minmax(0,1fr)]">
            <div className="order-1 flex w-full justify-center lg:order-2 lg:justify-end rtl:lg:order-1 rtl:lg:justify-start">
              <div className="relative z-20 w-full">
                <HeroLogoLockup />
              </div>
            </div>

            <div className="order-2 z-30 flex w-full justify-center lg:order-1 lg:justify-start rtl:lg:order-2">
              <HeroContent />
            </div>
          </div>
        </div>

        <ScrollIndicator />
      </div>
    </section>
  );
}
