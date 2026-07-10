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
      <div className="relative aspect-square w-[235px] sm:w-[320px] md:w-[390px] lg:w-[430px]">
        {/* Cinematic glow — the true focal anchor. Large, soft, and warm,
            it reads as the "globe's" ambient light from a distance, so
            the eye lands on the glowing sphere of light first and the
            (now smaller) logo mark second. */}
        <div
          aria-hidden="true"
          className="absolute inset-[-18%] animate-glow-pulse rounded-full opacity-90 [animation-duration:7s]"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(224,193,121,0.28) 0%, rgba(201,162,75,0.14) 35%, rgba(10,14,20,0) 70%)",
            filter: "blur(18px)",
          }}
        />

        

        <OrbitAccent />

        {/* Logo mark — inset 15% on every side (≈30% smaller than the
            glow/ring stage around it), so the orbiting light + glow read
            as the dominant "globe" and the logo sits inside it, smaller
            and quieter, rather than dominating the composition. */}
        <div className="absolute inset-[18%] z-10">
          <Image
            src="/images/logo/prime-global-logo.png"
            alt="Prime Global"
            fill
            priority
            sizes="(min-width: 1024px) 340px, (min-width: 768px) 310px, (min-width: 640px) 270px, 205px"
            className="object-contain drop-shadow-[0_0_36px_rgba(201,162,75,0.4)]"
          />
        </div>
      </div>
    </div>
  );
}
