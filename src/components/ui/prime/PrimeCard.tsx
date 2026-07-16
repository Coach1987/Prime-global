import { ElementType, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

type PrimeCardProps<T extends ElementType = "article"> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

export function PrimeCard<T extends ElementType = "article">({
  as,
  className,
  ...props
}: PrimeCardProps<T>) {
  const Component = as ?? "article";

  return (
    <Component
      className={cn(
        "rounded-[1.35rem] border border-blue-200/20 bg-[#081223]/82 shadow-[0_0_0_1px_rgba(120,177,242,0.12),0_18px_42px_rgba(2,10,22,0.52),0_0_24px_rgba(63,138,230,0.18)] backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}
