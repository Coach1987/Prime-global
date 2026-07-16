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
        "rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] shadow-[0_24px_70px_rgba(3,8,20,0.35),0_0_0_1px_rgba(98,161,232,0.14),0_0_26px_rgba(58,126,212,0.18)] backdrop-blur-[18px]",
        className
      )}
      {...props}
    />
  );
}
