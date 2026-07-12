import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Registered once here rather than repeated in every component that uses
// ScrollTrigger (previously duplicated across
// ServicesSection, WhyUsSection, FAQSection, and Footer).
// gsap.registerPlugin is idempotent and safe to call multiple times, but
// centralizing this makes the "register once" intent explicit rather than
// incidental, and gives every consumer a single import to reach for.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };
