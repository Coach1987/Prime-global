import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactInfoCard } from "./ContactInfoCard";
import { ContactForm } from "./ContactForm";
import { ContactMap } from "./ContactMap";

export async function ContactSection() {
  const t = await getTranslations("contact");

  return (
    <section
      id="contact"
      className="relative isolate overflow-hidden bg-[#020711] py-20 md:py-32 lg:py-40"
    >
      {/* Cinematic Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#020711_0%,#06111d_45%,#030814_100%)]" />

        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[size:70px_70px]" />

        <div className="absolute left-[-240px] top-[10%] h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-[170px]" />

        <div className="absolute right-[-240px] bottom-0 h-[520px] w-[520px] rounded-full bg-cyan-500/8 blur-[180px]" />
      </div>

      <div className="mx-auto max-w-[1380px] px-5 sm:px-6 md:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
          />
        </div>

        <div
          aria-hidden="true"
          className="mx-auto mt-10 flex max-w-md items-center gap-4"
        >
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-400/30" />
          <span className="h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_14px_rgba(120,190,255,.9)]" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-blue-400/30" />
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[430px_1fr]">
          <ContactInfoCard />
          <ContactForm />
        </div>

        <div className="mt-10 overflow-hidden rounded-[28px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,.35)]">
          <ContactMap />
        </div>
      </div>
    </section>
  );
}
