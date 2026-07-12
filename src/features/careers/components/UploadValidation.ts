import type { UploadPreview } from "../types";
import { CAREER_UPLOAD_RULES, uploadTypeLabelByMime } from "./UploadTypes";

function toMb(bytes: number) {
  return bytes / (1024 * 1024);
}

export function validateUploadFile(file: File) {
  if (!CAREER_UPLOAD_RULES.acceptedMimeTypes.includes(file.type)) {
    return { valid: false, reason: "invalidType" as const };
  }

  if (toMb(file.size) > CAREER_UPLOAD_RULES.maxFileSizeMb) {
    return { valid: false, reason: "tooLarge" as const };
  }

  return { valid: true as const };
}

export function toUploadPreview(file: File): UploadPreview {
  const sizeLabel = `${toMb(file.size).toFixed(2)} MB`;
  return {
    name: file.name,
    sizeLabel,
    typeLabel: uploadTypeLabelByMime[file.type] ?? "other",
  };
}