"use client";

import Image from "next/image";
import { OrbitAccent } from "./OrbitAccent";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center">
      <div className="relative aspect-square w-[340px] sm:w-[410px] md:w-[470px] lg:w-[520px]">

        {/* Subtle orbital lines only — no blue glow */}
        <div className="absolute inset-[1%] z-0 opacity-45">
          <OrbitAccent />
        </div>

        {/* Original globe + arrow + PRIME GLOBAL typography */}
        <div className="absolute inset-[6%] z-10">
          <Image
            src="/images/logo/prime-global-logo.png"
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
