"use client";

import Image from "next/image";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center">
      <div className="relative aspect-square w-[300px] max-w-[82vw] sm:w-[360px] md:w-[430px] lg:w-[500px] xl:w-[560px]">
        <div className="absolute inset-[3%] z-0 rounded-full bg-[radial-gradient(circle,rgba(124,188,255,0.48),rgba(124,188,255,0.16)_54%,transparent_74%)] blur-[60px]" />
        <div className="absolute inset-[0%] z-20">
          <Image
            src="/images/logo/prime-global-logo-clean.png"
            alt="Prime Global"
            fill
            priority
            sizes="(min-width:1280px) 560px, (min-width:768px) 430px, (min-width:640px) 360px, 300px"
            className="object-contain select-none"
          />
        </div>
      </div>
    </div>
  );
}
