"use client";

import Image from "next/image";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center px-0">
      <div className="relative aspect-[718/584] w-[min(88vw,620px)] max-w-[620px] sm:w-[min(82vw,680px)] md:w-[min(72vw,760px)] md:max-w-[760px]">
        <div className="absolute left-1/2 top-[40%] aspect-square w-[41%] -translate-x-1/2 -translate-y-1/2 sm:w-[40%] md:w-[39%]">
          <Image
            src="/images/logo/prime-global-mark.png"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 296px, (min-width: 640px) 272px, 40vw"
            className="select-none object-contain object-center"
            draggable={false}
            aria-hidden="true"
          />
        </div>

        <div className="absolute left-1/2 top-[40%] h-[46%] w-[71%] -translate-x-1/2 -translate-y-1/2 rotate-[-16deg] sm:h-[45%] sm:w-[69%] md:h-[44%] md:w-[68%]">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-white/18 opacity-70 shadow-[0_0_24px_rgba(76,147,255,0.08)] animate-spin motion-reduce:animate-none"
            style={{ animationDuration: "40s" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-[11%] rounded-full border border-transparent border-t-white/16 border-r-white/35 border-b-transparent border-l-transparent opacity-55"
          />
        </div>
      </div>
    </div>
  );
}
