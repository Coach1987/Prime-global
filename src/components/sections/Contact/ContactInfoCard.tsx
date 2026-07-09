"use client";

import { useTranslations } from "next-intl";
import { IconBadge } from "@/components/ui/IconBadge";
import { CONTACT_INFO, WHATSAPP_LINK, EMAIL_LINK, WEBSITE_LINK } from "@/lib/constants/contact";

export function ContactInfoCard() {
  const t = useTranslations("contact.info");

  const rows = [
    {
      key: "whatsapp",
      icon: "whatsapp" as const,
      label: t("whatsapp"),
      value: CONTACT_INFO.whatsappNumber,
      href: WHATSAPP_LINK,
      external: true,
    },
    {
      key: "email",
      icon: "mail" as const,
      label: t("email"),
      value: CONTACT_INFO.email,
      href: EMAIL_LINK,
      external: false,
    },
    {
      key: "website",
      icon: "globe" as const,
      label: t("website"),
      value: CONTACT_INFO.website,
      href: WEBSITE_LINK,
      external: true,
    },
    {
      key: "location",
      icon: "pin" as const,
      label: t("location"),
      value: CONTACT_INFO.location,
      href: null as string | null,
      external: false,
    },
  ];

  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-md md:p-10">
      <h2 className="font-heading text-2xl text-text-primary">{t("title")}</h2>

      <div className="mt-8 flex flex-col gap-6">
        {rows.map((row) => {
          const content = (
            <div className="flex items-center gap-4">
              <IconBadge icon={row.icon} size="sm" />
              <div className="text-start">
                <p className="text-[13px] text-text-tertiary">{row.label}</p>
                <p className="mt-0.5 text-[15px] font-medium text-text-primary" dir="ltr">
                  {row.value}
                </p>
              </div>
            </div>
          );

          return (
            <div key={row.key} className="border-b border-white/[0.08] pb-6 last:border-0 last:pb-0">
              {row.href ? (
                <a
                  href={row.href}
                  target={row.external ? "_blank" : undefined}
                  rel={row.external ? "noopener noreferrer" : undefined}
                  className="group -m-2 flex items-center rounded-xl p-2 transition-colors duration-200 hover:bg-white/[0.04]"
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
