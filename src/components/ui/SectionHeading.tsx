import { cn } from "@/lib/utils/cn";

interface SectionHeadingProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn("mx-auto max-w-[640px] text-center", className)}>
      <div data-home-reveal="eyebrow" className="mb-4 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-accent-primary">
        <span className="h-1 w-1 rounded-full bg-accent-primary" />
        {eyebrow}
      </div>
      <h2 data-home-reveal="heading" className="font-heading text-[28px] leading-tight text-text-primary sm:text-4xl md:text-[42px]">
        {title}
      </h2>
      {description && (
        <p data-home-reveal="body" className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-text-secondary md:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
