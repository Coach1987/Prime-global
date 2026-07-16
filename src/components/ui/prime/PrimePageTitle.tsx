import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function PrimePageTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "font-heading text-4xl text-transparent",
        "bg-gradient-to-b from-[#eef3f8] via-[#b5c2d0] to-[#7f92a7] bg-clip-text",
        "[text-shadow:0_1px_0_rgba(255,255,255,0.16),0_0_16px_rgba(102,152,212,0.22)]",
        className
      )}
      {...props}
    />
  );
}
