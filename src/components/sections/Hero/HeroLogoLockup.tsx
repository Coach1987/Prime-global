"use client";

import Image from "next/image";
import { OrbitAccent } from "./OrbitAccent";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center px-0">
      <div className="relative aspect-[1.26/1] w-[min(102vw,760px)] max-w-[760px] sm:w-[min(90vw,720px)] sm:max-w-[720px] lg:w-[min(76vw,780px)] lg:max-w-[780px]">
        <div className="absolute inset-[-7%] rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(69,172,255,0.46),transparent_54%),radial-gradient(circle_at_50%_44%,rgba(112,198,255,0.22),transparent_38%)] blur-[38px]" />
        <div className="absolute inset-[0.5%] opacity-95">
          <OrbitAccent />
        </div>
        <div className="absolute inset-[3.4%] sm:inset-[3.2%]">
          <Image
            src="/images/logo/prime-global-logo-clean.png"
            alt="Prime Global"
            fill
            priority
            sizes="(min-width:1280px) 780px, (min-width:1024px) 720px, (min-width:640px) 700px, 760px"
            className="object-contain scale-[1.08] sm:scale-[1.1] select-none drop-shadow-[0_34px_62px_rgba(0,0,0,0.42)]"
          />
        </div>
      </div>
    </div>
  );
}
