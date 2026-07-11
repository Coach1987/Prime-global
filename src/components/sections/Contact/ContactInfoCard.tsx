"use client";

import { useTranslations } from "next-intl";
import {
  CONTACT_INFO,
  WHATSAPP_LINK,
  EMAIL_LINK,
  WEBSITE_LINK,
} from "@/lib/constants/contact";
import { IconBadge } from "@/components/ui/IconBadge";

export function ContactInfoCard() {
  const t = useTranslations("contact.info");

  const rows = [
    {
      icon: "whatsapp" as const,
      label: t("whatsapp"),
      value: CONTACT_INFO.whatsappNumber,
      href: WHATSAPP_LINK,
      external: true,
    },
    {
      icon: "mail" as const,
      label: t("email"),
      value: CONTACT_INFO.email,
      href: EMAIL_LINK,
      external: false,
    },
    {
      icon: "globe" as const,
      label: t("website"),
      value: CONTACT_INFO.website,
      href: WEBSITE_LINK,
      external: true,
    },
    {
      icon: "pin" as const,
      label: t("location"),
      value: CONTACT_INFO.location,
      href: null,
      external: false,
    },
  ];

  return (
    <div
      className="
      relative
      overflow-hidden
      rounded-[30px]
      border
      border-white/10
      bg-gradient-to-b
      from-white/[0.05]
      to-white/[0.02]
      p-8
      backdrop-blur-2xl
      shadow-[0_24px_70px_rgba(0,0,0,.35)]
      md:p-10
    "
    >
      <div
        aria-hidden
        className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-blue-500/10 blur-[120px]"
      />

      <h2 className="relative font-heading text-3xl text-white">
        {t("title")}
      </h2>

      <div className="mt-3 h-px w-16 bg-gradient-to-r from-blue-300 to-transparent" />

      <div className="mt-10 space-y-6">
        {rows.map((row) => {
          const content = (
            <div className="flex items-center gap-5">
              <IconBadge icon={row.icon} size="md" />

              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
                  {row.label}
                </p>

                <p
                  dir="ltr"
                  className="mt-1 text-[15px] font-medium text-white"
                >
                  {row.value}
                </p>
              </div>
            </div>
          );

          return (
            <div
              key={row.label}
              className="
              rounded-2xl
              border
              border-white/6
              bg-white/[0.02]
              p-5
              transition-all
              duration-300
              hover:border-blue-300/35
              hover:bg-blue-500/[0.04]
            "
            >
              {row.href ? (
                <a
                  href={row.href}
                  target={row.external ? "_blank" : undefined}
                  rel={row.external ? "noopener noreferrer" : undefined}
                >
                  {content}
                </a>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
