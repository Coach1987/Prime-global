import { forwardRef, InputHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { PrimeInput } from "@/components/ui/prime/PrimeInput";

type PrimePasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  showPasswordLabel: string;
  hidePasswordLabel: string;
};

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M10.58 10.58a2 2 0 102.84 2.84"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.88 4.24A10.86 10.86 0 0112 4c5.5 0 9.4 3.54 10.67 7.35a1.95 1.95 0 010 1.3 11.06 11.06 0 01-4.14 5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.61 6.61A11.06 11.06 0 001.33 11.35a1.95 1.95 0 000 1.3C2.6 16.46 6.5 20 12 20c1.68 0 3.24-.33 4.64-.92"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M1.33 12.65a1.95 1.95 0 010-1.3C2.6 7.54 6.5 4 12 4s9.4 3.54 10.67 7.35a1.95 1.95 0 010 1.3C21.4 16.46 17.5 20 12 20S2.6 16.46 1.33 12.65z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export const PrimePasswordInput = forwardRef<HTMLInputElement, PrimePasswordInputProps>(function PrimePasswordInput(
  { className, showPasswordLabel, hidePasswordLabel, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  const tooltip = visible ? hidePasswordLabel : showPasswordLabel;

  return (
    <div className="relative">
      <PrimeInput
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-14", className)}
      />

      <button
        type="button"
        aria-label={tooltip}
        title={tooltip}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-2xl text-blue-200/90 transition-colors hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60"
      >
        <PasswordEyeIcon visible={visible} />
      </button>
    </div>
  );
});
