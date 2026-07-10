"use client";

import Image from "next/image";
import { OrbitAccent } from "./OrbitAccent";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center">
      <div className="relative aspect-square w-[420px] sm:w-[480px] md:w-[550px] lg:w-[610px]">

        {/* Subtle orbital lines only — no blue glow */}
        <div className="absolute inset-[12%] z-0 opacity-45">
          <OrbitAccent />
        </div>

        {/* Original globe + arrow + PRIME GLOBAL typography */}
        <div className="absolute inset-[1%] z-10">
          <Image
            src="/images/logo/prime-global-logo-clean.png"
            alt="Prime Global"
            fill
            priority
            sizes="(min-width: 1024px) 500px, (min-width: 768px) 450px, 340px"
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
