"use client";

import { useTranslations } from "next-intl";
import { IconBadge } from "@/components/ui/IconBadge";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import type { WhyUsItem } from "@/lib/constants/whyUs";

interface FeatureCardProps {
  item: WhyUsItem;
  showDivider: boolean;
}

export function FeatureCard({ item, showDivider }: FeatureCardProps) {
  const t = useTranslations(`whyUs.items.${item.key}`);

  return (
    <div className="relative flex flex-1 items-center">
      {/* Vertical divider between columns, desktop only, skipped before the first item */}
      {showDivider && (
        <span
          aria-hidden="true"
          className="absolute start-0 top-1/2 hidden h-24 w-px -translate-y-1/2 -translate-x-3 rtl:translate-x-3 bg-white/10 md:block"
        />
      )}

      <div className="group flex w-full flex-col items-center px-4 text-center">
        <div data-feature-icon>
          <IconBadge icon={item.icon} size="md" />
        </div>

        {/* Animated stat, appears just below the icon as a credibility anchor */}
        <div className="mt-5 font-heading text-3xl text-accent-primary">
          <AnimatedCounter
            value={item.statValue}
            suffix={item.statSuffix}
            prefix={item.statPrefix}
          />
        </div>

        <h3 className="mt-3 font-heading text-lg text-text-primary transition-colors duration-300 group-hover:text-accent-bright">
          {t("title")}
        </h3>

        <p className="mt-2 max-w-[260px] text-[15px] leading-relaxed text-text-secondary">
          {t("description")}
        </p>
      </div>
    </div>
  );
}
