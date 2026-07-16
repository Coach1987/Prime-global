import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function PrimeIconBadge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200/34",
        "bg-gradient-to-br from-[#183e66] via-[#102a49] to-[#0a1a31] text-blue-100",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_10px_24px_rgba(23,94,186,0.34),0_0_16px_rgba(68,147,243,0.18)]",
        className
      )}
      {...props}
    />
  );
}
