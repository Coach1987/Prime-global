"use client";

import Image from "next/image";
import { OrbitAccent } from "./OrbitAccent";

export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex w-full flex-col items-center justify-center">
      {/* Globe and silver arrow */}
      <div className="relative aspect-square w-[300px] sm:w-[360px] md:w-[420px] lg:w-[470px]">
        {/* Soft blue light */}
        <div
          aria-hidden="true"
          className="absolute inset-[3%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 48%, rgba(37,140,255,0.24) 0%, rgba(0,102,255,0.12) 35%, rgba(2,10,25,0) 70%)",
            filter: "blur(24px)",
          }}
        />

        {/* Animated orbital lines behind the globe */}
        <div className="absolute inset-[1%] z-0">
          <OrbitAccent />
        </div>

        {/* Separate globe and arrow image */}
        <div className="absolute inset-[8%] z-10">
          <Image
            src="/images/logo/prime-global-mark.png"
            alt="Prime Global globe and arrow"
            fill
            priority
            sizes="(min-width: 1024px) 430px, (min-width: 768px) 390px, 300px"
            className="object-contain drop-shadow-[0_0_28px_rgba(0,119,255,0.38)]"
          />
        </div>
      </div>

      {/* Separate silver and blue wordmark */}
      <div className="-mt-10 flex flex-col items-center text-center sm:-mt-12">
        <span
          className="bg-gradient-to-b from-white via-slate-200 to-slate-500 bg-clip-text font-serif text-[64px] font-semibold leading-[0.9] tracking-[0.08em] text-transparent drop-shadow-[0_6px_12px_rgba(0,0,0,0.7)] sm:text-[78px] md:text-[92px]"
        >
          PRIME
        </span>

        <div className="mt-3 flex items-center gap-3">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-blue-400" />

          <span className="bg-gradient-to-b from-blue-200 via-blue-400 to-blue-700 bg-clip-text text-[21px] font-semibold tracking-[0.42em] text-transparent sm:text-[25px]">
            GLOBAL
          </span>

          <span className="h-px w-10 bg-gradient-to-l from-transparent to-blue-400" />
        </div>
      </div>
    </div>
  );
}
