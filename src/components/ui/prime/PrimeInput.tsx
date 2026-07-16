import { forwardRef, InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function PrimeLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm text-slate-300", className)} {...props} />;
}

export const PrimeInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PrimeInput(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-2xl border border-blue-200/20 bg-[#061123] px-4 py-3 text-slate-100 placeholder:text-slate-500",
        "transition focus:border-blue-300/60 focus:shadow-[0_0_0_1px_rgba(126,192,255,0.4),0_0_18px_rgba(65,140,238,0.35)] focus:outline-none",
        className
      )}
      {...props}
    />
  );
});

export const PrimeTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function PrimeTextarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-2xl border border-blue-200/20 bg-[#061123] px-4 py-3 text-slate-100 placeholder:text-slate-500",
        "transition focus:border-blue-300/60 focus:shadow-[0_0_0_1px_rgba(126,192,255,0.4),0_0_18px_rgba(65,140,238,0.35)] focus:outline-none",
        className
      )}
      {...props}
    />
  );
});

export const PrimeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function PrimeSelect(
  { className, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-2xl border border-blue-200/20 bg-[#061123] px-4 py-3 text-slate-100",
        "transition focus:border-blue-300/60 focus:shadow-[0_0_0_1px_rgba(126,192,255,0.4),0_0_18px_rgba(65,140,238,0.35)] focus:outline-none",
        className
      )}
      {...props}
    />
  );
});

export function PrimeCheckbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "mt-1 h-4 w-4 rounded border border-blue-200/35 bg-[#061123] text-blue-300",
        "focus:ring-2 focus:ring-blue-300/60 focus:ring-offset-0",
        className
      )}
      {...props}
    />
  );
}
