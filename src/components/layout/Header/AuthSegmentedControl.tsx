"use client";

import { usePathname } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { cn } from "@/lib/utils/cn";
import { Suspense, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

type AuthSegmentedControlProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

function AuthSegmentedControlContent({ mobile = false, onNavigate }: AuthSegmentedControlProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isRtl = locale === "ar";

  const modeItems = useMemo(
    () => [
      { label: t("signIn"), value: "signin" },
      { label: t("createAccount"), value: "signup" },
    ],
    [t]
  );

  const isAuthRoute = pathname.endsWith("/auth");
  const registerMode = searchParams.get("mode") === "register" || searchParams.get("mode") === "signup";
  const activeIndex = isAuthRoute && registerMode ? 1 : 0;

  function activateSegment(index: number) {
    onNavigate?.();
    router.push(index === 0 ? "/auth?mode=signin&role=candidate" : "/auth?mode=signup&role=candidate");
  }

  return (
    <SegmentedTabs
      label={t("signIn") + " / " + t("createAccount")}
      items={modeItems}
      activeIndex={activeIndex}
      onChange={activateSegment}
      isRtl={isRtl}
      className={cn(
        mobile ? "mt-10 w-full" : "hidden w-fit md:inline-flex"
      )}
    />
  );
}

export function AuthSegmentedControl({ mobile = false, onNavigate }: AuthSegmentedControlProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const fallbackItems = useMemo(
    () => [
      { label: t("signIn"), value: "signin" },
      { label: t("createAccount"), value: "signup" },
    ],
    [t]
  );

  return (
    <Suspense
      fallback={
        <SegmentedTabs
          label={t("signIn") + " / " + t("createAccount")}
          items={fallbackItems}
          activeIndex={0}
          onChange={() => undefined}
          isRtl={isRtl}
          className={cn(mobile ? "mt-10 w-full" : "hidden w-fit md:inline-flex")}
        />
      }
    >
      <AuthSegmentedControlContent mobile={mobile} onNavigate={onNavigate} />
    </Suspense>
  );
}
