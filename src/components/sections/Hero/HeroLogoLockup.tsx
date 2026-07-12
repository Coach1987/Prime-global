"use client";

import Image from "next/image";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto -mt-3 flex w-full items-center justify-center px-0 sm:-mt-4 md:mt-0">
      <div className="relative aspect-[1536/1024] w-[min(78vw,646px)] max-w-[760px] sm:w-[min(72vw,595px)] md:w-[min(84vw,700px)] lg:w-[min(48vw,760px)]">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[24.5%] h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/12 blur-3xl md:top-[28.5%] md:h-[34%] md:w-[34%]"
        />

        <Image
          src="/images/logo/prime-global-logo-clean.png"
          alt="Prime Global"
          fill
          priority
          sizes="(min-width: 1280px) 760px, (min-width: 1024px) 48vw, (min-width: 768px) 84vw, (min-width: 640px) 72vw, 78vw"
          className="select-none object-contain object-center"
          draggable={false}
        />
      </div>
    </div>
  );
}
