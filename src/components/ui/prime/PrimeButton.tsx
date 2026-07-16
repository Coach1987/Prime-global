import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type PrimeButtonVariant = "primary" | "secondary";
type PrimeButtonSize = "md" | "sm";

type PrimeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PrimeButtonVariant;
  size?: PrimeButtonSize;
};

export function primeButtonClasses(variant: PrimeButtonVariant = "primary", size: PrimeButtonSize = "md") {
  const base =
    "relative inline-flex items-center justify-center overflow-hidden rounded-full font-semibold leading-none transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060f1f]";

  const sizeClass = size === "sm" ? "min-h-9 px-4 py-2 text-xs" : "min-h-12 px-6 py-3 text-sm";

  if (variant === "secondary") {
    return cn(
      base,
      sizeClass,
      "border border-blue-200/35 bg-[#08162a] text-slate-200 shadow-[0_8px_20px_rgba(19,74,145,0.24)]",
      "hover:-translate-y-0.5 hover:border-blue-200/55 hover:shadow-[0_0_0_1px_rgba(173,215,255,0.2),0_14px_26px_rgba(22,93,181,0.34),0_0_24px_rgba(82,159,255,0.3)]",
      "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
    );
  }

  return cn(
    base,
    sizeClass,
    "border border-blue-100/55 text-[#ecf6ff]",
    "bg-gradient-to-b from-[#6EC8FF] via-[#2E8FFF] to-[#0B5FC7]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(5,27,66,0.6),0_0_0_1px_rgba(168,214,255,0.22),0_12px_28px_rgba(13,86,183,0.38),0_0_24px_rgba(79,163,255,0.32)]",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:-translate-x-[140%]",
    "hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),inset_0_-1px_2px_rgba(5,27,66,0.7),0_0_0_1px_rgba(190,226,255,0.42),0_18px_30px_rgba(14,94,198,0.44),0_0_30px_rgba(100,182,255,0.56)] hover:before:translate-x-[140%] hover:before:transition-transform hover:before:duration-700",
    "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  );
}

export function PrimeButton({
  className,
  variant = "primary",
  size = "md",
  ...props
}: PrimeButtonProps) {
  return <button className={cn(primeButtonClasses(variant, size), className)} {...props} />;
}
