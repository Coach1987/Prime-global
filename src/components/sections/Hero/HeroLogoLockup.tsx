"use client";

import Image from "next/image";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center px-0">
      <div className="relative aspect-[1536/1024] w-[min(92vw,760px)] max-w-[760px] sm:w-[min(84vw,700px)] lg:w-[min(48vw,760px)]">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[28.5%] h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/12 blur-3xl"
        />

        <Image
          src="/images/logo/prime-global-logo-clean.png"
          alt="Prime Global"
          fill
          priority
          sizes="(min-width: 1280px) 760px, (min-width: 1024px) 48vw, (min-width: 640px) 84vw, 92vw"
          className="select-none object-contain object-center"
          draggable={false}
        />

        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[28.5%] aspect-square w-[36%] -translate-x-1/2 -translate-y-1/2 animate-spin motion-reduce:animate-none"
          style={{ animationDuration: "40s", animationTimingFunction: "linear" }}
        >
          <div className="absolute inset-0 rounded-full border border-white/18" />
        </div>
      </div>
    </div>
  );
}
