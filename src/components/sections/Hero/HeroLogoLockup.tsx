"use client";

import Image from "next/image";
import { OrbitAccent } from "./OrbitAccent";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center">
      <div className="relative aspect-square w-[560px] max-w-[94vw] sm:w-[620px] md:w-[700px] lg:w-[760px]">
        <div className="absolute inset-[16%] z-0 opacity-20">
          <OrbitAccent />
        </div>

        <div className="absolute inset-[-5%] z-10">
          <Image
            src="/images/logo/prime-global-logo-clean.png"
            alt="Prime Global"
            fill
            priority
            sizes="(min-width:1024px) 760px, (min-width:768px) 700px, 560px"
            className="object-contain select-none"
          />
        </div>
      </div>
    </div>
  );
}
