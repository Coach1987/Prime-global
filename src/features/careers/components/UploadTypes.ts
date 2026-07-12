import type { UploadType, UploadValidationRule } from "../types";

export const CAREER_UPLOAD_RULES: UploadValidationRule = {
  maxFileSizeMb: 5,
  acceptedMimeTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

export const uploadTypeLabelByMime: Record<string, UploadType> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};