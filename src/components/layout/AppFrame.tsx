"use client";

import { ReactNode } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

type AppFrameProps = {
  children: ReactNode;
};

export function AppFrame({ children }: AppFrameProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const internalPrefix = `/${locale}/admin`;
  const isInternalRoute = pathname === internalPrefix || pathname.startsWith(`${internalPrefix}/`);

  if (isInternalRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
