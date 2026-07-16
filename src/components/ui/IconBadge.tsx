import type { ServiceIcon } from "@/lib/constants/services";
import type { WhyUsIcon } from "@/lib/constants/whyUs";
import { cn } from "@/lib/utils/cn";

export type ContactIcon = "whatsapp" | "mail" | "globe" | "pin";
export type BadgeIcon = ServiceIcon | WhyUsIcon | ContactIcon;

const ICON_PATHS: Record<BadgeIcon, React.ReactNode> = {
  briefcase: (
    <path
      d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-9 0h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm-1 4h14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  truck: (
    <path
      d="M3 7h11v8H3V7Zm11 3h3.5l2.5 3v2h-6v-5Z M6.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  users: (
    <path
      d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 8c0-2.76 2.69-5 6-5s6 2.24 6 5M17 11a2.5 2.5 0 1 0 0-5M20 19c0-2.3-1.85-4.2-4.32-4.8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  gears: (
    <path
      d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3c0 .34-.03.67-.08 1l1.68 1.31a.75.75 0 0 1 .18.95l-1.6 2.77a.75.75 0 0 1-.9.33l-1.98-.8c-.55.42-1.16.77-1.82 1.02l-.3 2.1a.75.75 0 0 1-.74.62h-3.2a.75.75 0 0 1-.74-.62l-.3-2.1a6.9 6.9 0 0 1-1.82-1.02l-1.98.8a.75.75 0 0 1-.9-.33l-1.6-2.77a.75.75 0 0 1 .18-.95L4.68 13c-.05-.33-.08-.66-.08-1s.03-.67.08-1L3 9.69a.75.75 0 0 1-.18-.95l1.6-2.77a.75.75 0 0 1 .9-.33l1.98.8c.55-.42 1.16-.77 1.82-1.02l.3-2.1A.75.75 0 0 1 10.16 2h3.2a.75.75 0 0 1 .74.62l.3 2.1c.66.25 1.27.6 1.82 1.02l1.98-.8a.75.75 0 0 1 .9.33l1.6 2.77a.75.75 0 0 1-.18.95L19.32 9c.05.33.08.66.08 1Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  ),
  bolt: (
    <path
      d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  handshake: (
    <path
      d="m2 12 4-4 4 2 4-4 4 2 4-2M2 12l3 3 2-1 2.5 2.5a1.5 1.5 0 0 0 2.12-2.12M2 12l3 5 2-1M22 10l-3 5-2.5-1.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  whatsapp: (
    <path
      d="M20 12a8 8 0 1 1-14.6-4.5L4 4l4.6 1.3A8 8 0 0 1 20 12Z M8.5 9.5c.2-.5.7-.5 1-.5.2 0 .4 0 .6.4.2.4.6 1.3.6 1.4.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.1.2-.3.3-.1.6.2.4.9 1.4 1.9 1.8.3.1.4.1.6-.1.1-.2.6-.7.7-.9.2-.2.3-.2.5-.1.2.1 1.3.6 1.5.7.2.1.3.2.3.3 0 .2 0 .8-.3 1.2-.3.4-1.1.8-1.6.8-.4 0-1.6-.2-3-1.4-1.7-1.5-2.4-2.9-2.5-3.4-.1-.5-.4-1.1 0-1.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  mail: (
    <path
      d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm0 0 8 7 8-7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path
        d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  ),
  pin: (
    <path
      d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
};

interface IconBadgeProps {
  icon: BadgeIcon;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { wrapper: "h-12 w-12", icon: "h-5 w-5" },
  md: { wrapper: "h-16 w-16", icon: "h-7 w-7" },
  lg: { wrapper: "h-20 w-20", icon: "h-9 w-9" },
};

export function IconBadge({ icon, size = "md", className }: IconBadgeProps) {
  const { wrapper, icon: iconSize } = SIZE_MAP[size];

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full",
        "bg-gradient-to-br from-[#12375d] to-bg-secondary",
        "border border-accent-bright/30 text-accent-bright",
        "shadow-[0_0_0_rgba(56,145,255,0)] transition-all duration-300 ease-premium-out",
        "group-hover:scale-[1.08] group-hover:border-accent-bright/60 group-hover:shadow-[0_0_24px_rgba(74,163,255,0.36)]",
        wrapper,
        className
      )}
    >
      <svg viewBox="0 0 24 24" className={iconSize} fill="none" aria-hidden="true">
        {ICON_PATHS[icon]}
      </svg>
    </span>
  );
}
