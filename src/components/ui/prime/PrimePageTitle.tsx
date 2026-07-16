import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function PrimePageTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "font-heading text-4xl text-transparent",
        "bg-gradient-to-b from-[#f7fbff] via-[#c6d3e3] to-[#8ea3bb] bg-clip-text",
        "[text-shadow:0_0_20px_rgba(111,168,235,0.28)]",
        className
      )}
      {...props}
    />
  );
}
