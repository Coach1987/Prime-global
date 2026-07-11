"use client";

import Image from "next/image";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center px-2 sm:px-0">
      <div className="relative aspect-square w-[min(94vw,620px)] max-w-[620px] sm:w-[min(86vw,700px)] sm:max-w-[700px] lg:w-[min(74vw,760px)] lg:max-w-[760px]">
        <div className="absolute inset-[-4%] rounded-full bg-[radial-gradient(circle_at_50%_43%,rgba(69,170,255,0.3),transparent_48%),radial-gradient(circle_at_50%_44%,rgba(88,189,255,0.14),transparent_34%)] blur-2xl" />
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
      </div>
    </div>
  );
}
