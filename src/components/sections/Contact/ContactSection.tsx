import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactInfoCard } from "./ContactInfoCard";
import { ContactForm } from "./ContactForm";
import { ContactMap } from "./ContactMap";

export async function ContactSection() {
  const t = await getTranslations("contact");

  return (
    <section id="contact" className="relative bg-bg-secondary py-16 md:py-32">
      <div className="mx-auto max-w-[1280px] px-5 md:px-8">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

        <div className="mt-14 grid grid-cols-1 gap-6 md:mt-16 md:grid-cols-[42%_58%]">
          <ContactInfoCard />
          <ContactForm />
        </div>

        <div className="mt-6">
          <ContactMap />
        </div>
      </div>
    </section>
  );
}
