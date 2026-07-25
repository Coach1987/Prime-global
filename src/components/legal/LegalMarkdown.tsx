import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@/i18n/routing";
import { resolveLegalSlugFromMarkdownLink } from "@/lib/legal/documents";

type LegalMarkdownProps = {
  content: string;
  locale: "en" | "ar";
};

export function LegalMarkdown({ content, locale }: LegalMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="font-heading text-3xl text-text-primary md:text-4xl">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-8 font-heading text-2xl text-text-primary md:text-[28px]">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-6 font-heading text-xl text-text-primary">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mt-4 text-[15px] leading-8 text-text-secondary md:text-base">{children}</p>
        ),
        ul: ({ children }) => <ul className="mt-3 list-disc space-y-2 ps-5 text-text-secondary">{children}</ul>,
        ol: ({ children }) => <ol className="mt-3 list-decimal space-y-2 ps-5 text-text-secondary">{children}</ol>,
        li: ({ children }) => <li className="leading-7">{children}</li>,
        a: ({ href = "", children }) => {
          const legalSlug = resolveLegalSlugFromMarkdownLink(href);

          if (legalSlug) {
            return (
              <Link
                href={`/legal/${legalSlug}`}
                locale={locale}
                className="font-medium text-blue-300 underline decoration-blue-300/50 underline-offset-4 transition-colors hover:text-blue-200"
              >
                {children}
              </Link>
            );
          }

          return (
            <a
              href={href}
              className="font-medium text-blue-300 underline decoration-blue-300/50 underline-offset-4 transition-colors hover:text-blue-200"
            >
              {children}
            </a>
          );
        },
        hr: () => <hr className="my-8 border-white/10" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}