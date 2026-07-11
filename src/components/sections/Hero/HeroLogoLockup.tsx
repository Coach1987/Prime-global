"use client";

import Image from "next/image";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center px-2 sm:px-0">
      <div className="relative aspect-square w-[min(96vw,682px)] max-w-[682px] sm:w-[min(90vw,770px)] sm:max-w-[770px] lg:w-[min(80vw,836px)] lg:max-w-[836px]">
        <div className="absolute inset-[-4%] rounded-full bg-[radial-gradient(circle_at_50%_43%,rgba(69,170,255,0.3),transparent_48%),radial-gradient(circle_at_50%_44%,rgba(88,189,255,0.14),transparent_34%)] blur-2xl" />
        <svg
          aria-hidden="true"
          viewBox="0 0 600 600"
          className="pointer-events-none absolute inset-[8%] h-[84%] w-[84%]"
        >
          <ellipse
            cx="300"
            cy="300"
            rx="252"
            ry="124"
            transform="rotate(-18 300 300)"
            fill="none"
            stroke="rgba(126,192,255,0.11)"
            strokeWidth="1"
          />
        </svg>
        <div className="absolute inset-0">
          <Image
            src="/images/logo/prime-global-logo-clean.png"
            alt="Prime Global"
            fill
            priority
            sizes="(min-width:1280px) 836px, (min-width:1024px) 770px, (min-width:640px) 720px, 682px"
            className="object-contain select-none drop-shadow-[0_24px_40px_rgba(0,0,0,0.32)]"
          />
        </div>
      </div>
    </div>
  );
}
