"use client";

import Image from "next/image";
import { OrbitAccent } from "./OrbitAccent";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center px-2 sm:px-0">
      <div className="relative aspect-square w-[min(96vw,620px)] max-w-[620px] sm:w-[min(88vw,700px)] sm:max-w-[700px] lg:w-[min(76vw,760px)] lg:max-w-[760px]">
        <div className="absolute inset-[-5%] rounded-full bg-[radial-gradient(circle_at_50%_42%,rgba(77,171,255,0.42),transparent_48%),radial-gradient(circle_at_50%_43%,rgba(140,210,255,0.18),transparent_32%)] blur-2xl" />

        <div className="absolute inset-0 opacity-70">
          <OrbitAccent />
        </div>

        <div className="absolute inset-0">
          <Image
            src="/images/logo/prime-global-logo-clean.png"
            alt="Prime Global"
            fill
            priority
            sizes="(min-width:1280px) 760px, (min-width:1024px) 740px, (min-width:640px) 700px, 620px"
            className="object-contain select-none drop-shadow-[0_24px_40px_rgba(0,0,0,0.32)]"
          />
        </div>

        {/* Single animated arrow layer sourced from the existing logo artwork. */}
        <div className="pointer-events-none absolute inset-0 origin-center animate-[spin_20s_linear_infinite]">
          <div className="absolute left-[15.4%] top-[13.6%] h-[31.5%] w-[72.8%] rotate-[16deg] overflow-hidden">
            <Image
              src="/images/logo/prime-global-logo-clean.png"
              alt=""
              fill
              sizes="(min-width:1280px) 560px, (min-width:1024px) 540px, (min-width:640px) 500px, 430px"
              className="max-w-none select-none object-none [object-position:31%_25%] brightness-[1.18] contrast-[1.22]"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
