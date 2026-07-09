import { Link } from "@/i18n/routing";

export interface FooterLinkItem {
  label: string;
  href: string;
}

interface FooterColumnProps {
  title: string;
  links: FooterLinkItem[];
}

export function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <h3 className="font-heading text-[13px] uppercase tracking-[0.08em] text-text-tertiary">
        {title}
      </h3>
      <ul className="mt-5 flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group relative inline-block text-[14px] text-text-secondary transition-colors duration-200 hover:text-text-primary"
            >
              {link.label}
              <span className="rtl:origin-right absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-accent-primary transition-transform duration-300 ease-premium-out group-hover:scale-x-100" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
