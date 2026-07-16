import type { PGPEProtectionSignalType, PGPEProviderResult } from "./types.ts";

export interface PGPEProviderInput {
  content: string;
  mimeType?: string;
  fileName?: string;
  language?: string;
  sourceId?: string;
}

export interface PGPEProvider {
  providerName: string;
  signalType: PGPEProtectionSignalType;
  protect(input: PGPEProviderInput): Promise<PGPEProviderResult[]>;
}

export interface EmailProtectionProvider extends PGPEProvider {
  signalType: "email";
}

export interface PhoneProtectionProvider extends PGPEProvider {
  signalType: "phone";
}

export interface QRProtectionProvider extends PGPEProvider {
  signalType: "qr";
}

export interface OCRProtectionProvider extends PGPEProvider {
  signalType: "ocr_text";
}

export interface URLProtectionProvider extends PGPEProvider {
  signalType: "url";
}

export interface DocumentProtectionProvider extends PGPEProvider {
  signalType: "document_text";
}

export interface MetadataProtectionProvider extends PGPEProvider {
  signalType: "hidden_metadata";
}

export interface AttachmentProtectionProvider extends PGPEProvider {
  signalType: "private_attachment";
}
