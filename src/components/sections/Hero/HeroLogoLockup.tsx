"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

export function HeroLogoLockup() {
  const lockupRef = useRef<HTMLDivElement>(null);
  const depthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lockupEl = lockupRef.current;
    const depthEl = depthRef.current;

    if (!lockupEl || !depthEl) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopPointer = window.matchMedia("(pointer:fine) and (min-width: 1024px)");

    let frameId = 0;
    let floatFrame = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let isVisible = true;

    const applyDepth = () => {
      currentX += (targetX - currentX) * 0.1;
      currentY += (targetY - currentY) * 0.1;

      depthEl.style.setProperty("--hero-depth-x", `${currentX.toFixed(2)}px`);
      depthEl.style.setProperty("--hero-depth-y", `${currentY.toFixed(2)}px`);

      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        frameId = window.requestAnimationFrame(applyDepth);
      } else {
        frameId = 0;
      }
    };

    const scheduleDepth = () => {
      if (frameId) {
        return;
      }
      frameId = window.requestAnimationFrame(applyDepth);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reduceMotion.matches || !desktopPointer.matches) {
        return;
      }

      const rect = lockupEl.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      targetX = nx * 6;
      targetY = ny * 4;
      scheduleDepth();
    };

    const resetDepth = () => {
      targetX = 0;
      targetY = 0;
      scheduleDepth();
    };

    const runMobileFloat = (time: number) => {
      if (reduceMotion.matches || desktopPointer.matches || !isVisible) {
        return;
      }

      const t = time * 0.001;
      targetX = Math.sin(t * 0.32) * 2.2;
      targetY = Math.cos(t * 0.26) * 1.8;
      scheduleDepth();
      floatFrame = window.requestAnimationFrame(runMobileFloat);
    };

    const stopMobileFloat = () => {
      if (floatFrame) {
        window.cancelAnimationFrame(floatFrame);
      }
      floatFrame = 0;
    };

    const syncMotionMode = () => {
      resetDepth();
      stopMobileFloat();

      if (isVisible && !reduceMotion.matches && !desktopPointer.matches) {
        floatFrame = window.requestAnimationFrame(runMobileFloat);
      }
    };

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry?.isIntersecting ?? false;
        syncMotionMode();
      },
      { rootMargin: "10% 0px" }
    );

    lockupEl.addEventListener("pointermove", onPointerMove);
    lockupEl.addEventListener("pointerleave", resetDepth);
    reduceMotion.addEventListener("change", syncMotionMode);
    desktopPointer.addEventListener("change", syncMotionMode);
    visibilityObserver.observe(lockupEl);

    syncMotionMode();

    return () => {
      lockupEl.removeEventListener("pointermove", onPointerMove);
      lockupEl.removeEventListener("pointerleave", resetDepth);
      reduceMotion.removeEventListener("change", syncMotionMode);
      desktopPointer.removeEventListener("change", syncMotionMode);
      visibilityObserver.disconnect();

      stopMobileFloat();

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div data-hero-lockup className="relative mx-auto -mt-3 flex w-full items-center justify-center px-0 will-change-transform sm:-mt-4 md:mt-0">
      <div ref={lockupRef} className="relative aspect-[1536/1024] w-[min(78vw,646px)] max-w-[760px] sm:w-[min(72vw,595px)] md:w-[min(74vw,610px)] lg:w-[min(48vw,760px)]">
        <div ref={depthRef} className="hero-depth-shell relative h-full w-full">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[25%] z-[6] h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_40%_42%,rgba(118,176,255,0.22)_0%,rgba(63,118,200,0.11)_38%,rgba(9,26,46,0)_70%)] blur-3xl md:top-[28%] md:h-[38%] md:w-[38%]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[64%] top-[28%] z-[6] h-[22%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_52%_48%,rgba(207,169,84,0.14)_0%,rgba(129,94,37,0.08)_38%,rgba(20,12,3,0)_74%)] blur-3xl md:h-[24%] md:w-[26%]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[24.5%] z-[11] h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/10 blur-3xl md:top-[28.5%] md:h-[33%] md:w-[33%]"
          />

          <Image
            src="/images/logo/prime-global-logo-clean.png"
            alt="Prime Global"
            fill
            priority
            sizes="(min-width: 1280px) 760px, (min-width: 1024px) 48vw, (min-width: 768px) 84vw, (min-width: 640px) 72vw, 78vw"
            className="relative z-20 select-none object-contain object-center"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
