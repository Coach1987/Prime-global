"use client";

import { ChangeEvent, useId, useRef } from "react";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";

type LocalizedFileInputProps = {
  isArabic: boolean;
  accept?: string;
  multiple?: boolean;
  onChange: (files: File[]) => void;
  selectedFiles: File[];
  inputRef?: (element: HTMLInputElement | null) => void;
  id?: string;
  className?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  singleLabel?: { en: string; ar: string };
  multiLabel?: { en: string; ar: string };
};

export function LocalizedFileInput({
  isArabic,
  accept,
  multiple = false,
  onChange,
  selectedFiles,
  inputRef,
  id,
  className,
  ariaInvalid,
  ariaDescribedBy,
  singleLabel,
  multiLabel,
}: LocalizedFileInputProps) {
  const generatedId = useId();
  const inputId = id ?? `localized-file-input-${generatedId}`;
  const nativeInputRef = useRef<HTMLInputElement | null>(null);

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(Array.from(event.target.files ?? []));
  }

  function openPicker() {
    nativeInputRef.current?.click();
  }

  const chooseSingleLabel = singleLabel
    ? (isArabic ? singleLabel.ar : singleLabel.en)
    : (isArabic ? "اختيار ملف" : "Choose file");
  const chooseMultiLabel = multiLabel
    ? (isArabic ? multiLabel.ar : multiLabel.en)
    : (isArabic ? "اختيار ملفات" : "Choose files");

  const selectedFeedback = selectedFiles.length === 0
    ? (isArabic ? "لم يتم اختيار ملف" : "No file selected")
    : selectedFiles.length === 1
      ? (isArabic ? "تم اختيار ملف واحد" : "1 file selected")
      : (isArabic ? `تم اختيار ${selectedFiles.length} ملفات` : `${selectedFiles.length} files selected`);

  return (
    <div className={className}>
      <input
        id={inputId}
        ref={(element) => {
          nativeInputRef.current = element;
          inputRef?.(element);
        }}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onChange={handleFilesChange}
      />

      <button
        type="button"
        onClick={openPicker}
        className={primeButtonClasses("secondary", "sm")}
        aria-controls={inputId}
      >
        {multiple ? chooseMultiLabel : chooseSingleLabel}
      </button>

      <p className="mt-2 text-xs text-text-secondary" dir={isArabic ? "rtl" : "ltr"}>
        {selectedFeedback}
      </p>

      {selectedFiles.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-text-secondary" dir="ltr">
          {selectedFiles.map((file, index) => (
            <li key={`${file.name}-${index}`}>{file.name}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
