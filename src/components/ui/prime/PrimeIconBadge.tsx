import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function PrimeIconBadge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200/30",
        "bg-gradient-to-br from-[#16385e] to-[#0b1c34] text-blue-100",
        "shadow-[0_10px_22px_rgba(30,106,197,0.36)]",
        className
      )}
      {...props}
    />
  );
}
