"use client";

import Image from "next/image";
import { OrbitAccent } from "./OrbitAccent";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center px-1 sm:px-0">
      <div className="relative aspect-[1.24/1] w-[min(95vw,640px)] max-w-[640px] sm:w-[min(88vw,700px)] sm:max-w-[700px] lg:w-[min(74vw,760px)] lg:max-w-[760px]">
        <div className="absolute inset-[-5%] rounded-full bg-[radial-gradient(circle_at_50%_38%,rgba(72,173,255,0.38),transparent_52%),radial-gradient(circle_at_50%_44%,rgba(88,189,255,0.2),transparent_36%)] blur-[34px]" />
        <div className="absolute inset-[3%] opacity-95">
          <OrbitAccent />
        </div>
        <div className="absolute inset-[9%]">
          <Image
            src="/images/logo/prime-global-logo-clean.png"
            alt="Prime Global"
            fill
            priority
            sizes="(min-width:1280px) 760px, (min-width:1024px) 740px, (min-width:640px) 700px, 640px"
            className="object-contain select-none drop-shadow-[0_26px_52px_rgba(0,0,0,0.38)]"
          />
        </div>
      </div>
    </div>
  );
}
