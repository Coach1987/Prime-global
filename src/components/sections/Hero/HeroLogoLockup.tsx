"use client";

import Image from "next/image";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center px-0">
      <div className="relative aspect-[718/584] w-[min(88vw,620px)] max-w-[620px] sm:w-[min(82vw,680px)] md:w-[min(72vw,760px)] md:max-w-[760px]">
        <Image
          src="/IMG_20260711_110755.jpg"
          alt="Prime Global reference image"
          fill
          priority
          sizes="(min-width: 1024px) 760px, (min-width: 640px) 680px, 88vw"
          className="object-contain select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}
