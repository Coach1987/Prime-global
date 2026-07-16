import type {
  AnalysisProviderSuite,
  ArchiveInspectionProvider,
  ArchiveInspectionResult,
  BarcodeProtectionProvider,
  DOCXTextExtractionProvider,
  FileTypeDetectionProvider,
  FileTypeDetectionResult,
  ImageAnalysisProvider,
  ImageAnalysisResult,
  MetadataProtectionProvider,
  MetadataProtectionResult,
  OCRProtectionProvider,
  PDFTextExtractionProvider,
  ProviderInvocationInput,
  QRProtectionProvider,
  TextExtractionResult,
} from "../providers/types.ts";

function detectFromExtension(fileName: string): FileTypeDetectionResult {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  const mapping: Record<string, FileTypeDetectionResult> = {
    pdf: {
      category: "pdf",
      extension,
      mimeType: "application/pdf",
      trustedBySignature: true,
      spoofingSuspected: false,
    },
    doc: {
      category: "doc",
      extension,
      mimeType: "application/msword",
      trustedBySignature: true,
      spoofingSuspected: false,
    },
    docx: {
      category: "docx",
      extension,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      trustedBySignature: true,
      spoofingSuspected: false,
    },
    png: {
      category: "png",
      extension,
      mimeType: "image/png",
      trustedBySignature: true,
      spoofingSuspected: false,
    },
    jpg: {
      category: "jpeg",
      extension,
      mimeType: "image/jpeg",
      trustedBySignature: true,
      spoofingSuspected: false,
    },
    jpeg: {
      category: "jpeg",
      extension,
      mimeType: "image/jpeg",
      trustedBySignature: true,
      spoofingSuspected: false,
    },
    webp: {
      category: "webp",
      extension,
      mimeType: "image/webp",
      trustedBySignature: true,
      spoofingSuspected: false,
    },
    zip: {
      category: "zip",
      extension,
      mimeType: "application/zip",
      trustedBySignature: true,
      spoofingSuspected: false,
    },
  };

  return (
    mapping[extension] ?? {
      category: "unknown",
      extension,
      mimeType: "application/octet-stream",
      trustedBySignature: false,
      spoofingSuspected: false,
    }
  );
}

function createTextResult(input: ProviderInvocationInput): TextExtractionResult {
  return {
    extractedText: input.mockTextContent ?? "",
    pageCount: 1,
    embeddedLinks: [],
  };
}

export function createInMemoryFileTypeDetectionProvider(overrides?: Partial<FileTypeDetectionResult>): FileTypeDetectionProvider {
  return {
    providerName: "file-type-detection",
    async detectFileType(input) {
      const detected = detectFromExtension(input.fileName);
      return { ...detected, ...(overrides ?? {}) };
    },
  };
}

export function createInMemoryOCRProtectionProvider(overrides?: Partial<TextExtractionResult>): OCRProtectionProvider {
  return {
    providerName: "ocr-protection",
    async extractTextFromImage(input) {
      return { ...createTextResult(input), ...(overrides ?? {}) };
    },
  };
}

export function createInMemoryQRProtectionProvider(overrides?: Partial<ImageAnalysisResult>): QRProtectionProvider {
  return {
    providerName: "qr-protection",
    async detectQr(input) {
      const detections = (input.mockImageSignals ?? []).filter((signal) => signal.type === "qr_code");
      return { detections, ...(overrides ?? {}) };
    },
  };
}

export function createInMemoryBarcodeProtectionProvider(overrides?: Partial<ImageAnalysisResult>): BarcodeProtectionProvider {
  return {
    providerName: "barcode-protection",
    async detectBarcode(input) {
      const detections = (input.mockImageSignals ?? []).filter((signal) => signal.type === "barcode");
      return { detections, ...(overrides ?? {}) };
    },
  };
}

export function createInMemoryPDFTextExtractionProvider(overrides?: Partial<TextExtractionResult>): PDFTextExtractionProvider {
  return {
    providerName: "pdf-text-extraction",
    async extractPdfText(input) {
      return { ...createTextResult(input), ...(overrides ?? {}) };
    },
  };
}

export function createInMemoryDOCXTextExtractionProvider(overrides?: Partial<TextExtractionResult>): DOCXTextExtractionProvider {
  return {
    providerName: "docx-text-extraction",
    async extractDocxText(input) {
      return { ...createTextResult(input), ...(overrides ?? {}) };
    },
  };
}

export function createInMemoryImageAnalysisProvider(overrides?: Partial<ImageAnalysisResult>): ImageAnalysisProvider {
  return {
    providerName: "image-analysis",
    async analyzeImage(input) {
      return { detections: input.mockImageSignals ?? [], ...(overrides ?? {}) };
    },
  };
}

export function createInMemoryMetadataProtectionProvider(
  overrides?: Partial<MetadataProtectionResult>
): MetadataProtectionProvider {
  return {
    providerName: "metadata-protection",
    async inspectMetadata(input) {
      return {
        hiddenMetadataKeys: input.mockMetadataKeys ?? [],
        embeddedLinks: [],
        ...(overrides ?? {}),
      };
    },
  };
}

export function createInMemoryArchiveInspectionProvider(
  overrides?: Partial<ArchiveInspectionResult>
): ArchiveInspectionProvider {
  return {
    providerName: "archive-inspection",
    async inspectArchive() {
      return {
        archiveDetected: false,
        nestedDepth: 0,
        fileCount: 1,
        suspicious: false,
        ...(overrides ?? {}),
      };
    },
  };
}

export function createInMemoryAnalysisProviderSuite(): AnalysisProviderSuite {
  return {
    fileTypeDetectionProvider: createInMemoryFileTypeDetectionProvider(),
    ocrProtectionProvider: createInMemoryOCRProtectionProvider(),
    qrProtectionProvider: createInMemoryQRProtectionProvider(),
    barcodeProtectionProvider: createInMemoryBarcodeProtectionProvider(),
    pdfTextExtractionProvider: createInMemoryPDFTextExtractionProvider(),
    docxTextExtractionProvider: createInMemoryDOCXTextExtractionProvider(),
    imageAnalysisProvider: createInMemoryImageAnalysisProvider(),
    metadataProtectionProvider: createInMemoryMetadataProtectionProvider(),
    archiveInspectionProvider: createInMemoryArchiveInspectionProvider(),
  };
}
