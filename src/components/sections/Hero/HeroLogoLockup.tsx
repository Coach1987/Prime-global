"use client";

import Image from "next/image";
import { OrbitAccent } from "./OrbitAccent";

/**
 * The hero's centered focal point: Prime Global's actual logo artwork
 * (globe + ring + arrow + "PRIME GLOBAL" wordmark, all baked into one
 * image) — used exactly as provided, not recreated or redesigned.
 *
 * Since the arrow is fused into the static logo image itself, it can't
 * be independently animated without altering the artwork. Instead, an
 * `OrbitAccent` layer renders BEHIND the logo: a separate, subtle
 * rotating ring + traveling light that orbits around the static mark,
 * giving continuous motion without touching a single pixel of the
 * original logo.
 */
export function HeroLogoLockup() {
  return (
    <div className="relative mx-auto flex flex-col items-center">
      <div className="relative aspect-square w-[240px] sm:w-[300px] md:w-[380px]">
        <OrbitAccent />

        <Image
          src="/images/logo/prime-global-logo.png"
          alt="Prime Global"
          fill
          priority
          sizes="(min-width: 768px) 380px, (min-width: 640px) 300px, 240px"
          className="relative z-10 object-contain drop-shadow-[0_0_40px_rgba(201,162,75,0.35)]"
        />
      </div>
    </div>
  );
}
