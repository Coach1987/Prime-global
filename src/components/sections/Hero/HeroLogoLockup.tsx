"use client";

import Image from "next/image";
import { OrbitAccent } from "./OrbitAccent";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center px-0">
      <div className="relative aspect-[1.24/1] w-[min(104vw,800px)] max-w-[800px] sm:w-[min(92vw,760px)] sm:max-w-[760px] lg:w-[min(78vw,800px)] lg:max-w-[800px]">
        <div className="absolute inset-[-6%] rounded-full bg-[radial-gradient(circle_at_50%_38%,rgba(72,173,255,0.42),transparent_52%),radial-gradient(circle_at_50%_44%,rgba(88,189,255,0.24),transparent_36%)] blur-[36px]" />
        <div className="absolute inset-[1%] opacity-95">
          <OrbitAccent />
        </div>
        <div className="absolute inset-[3%]">
          <Image
            src="/images/logo/prime-global-logo-clean.png"
            alt="Prime Global"
            fill
            priority
            sizes="(min-width:1280px) 800px, (min-width:1024px) 760px, (min-width:640px) 740px, 800px"
            className="object-contain scale-[1.18] select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.4)]"
          />
        </div>
      </div>
    </div>
  );
}
