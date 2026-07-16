import type {
  AnalysisProviderName,
  FindingCoordinateRegion,
  ProviderResultEnvelope,
  SupportedFileCategory,
} from "../types.ts";

export interface FileTypeDetectionResult {
  category: SupportedFileCategory;
  extension: string;
  mimeType: string;
  trustedBySignature: boolean;
  spoofingSuspected: boolean;
}

export interface TextExtractionResult {
  extractedText: string;
  pageCount: number;
  embeddedLinks: string[];
}

export interface ImageDetection {
  type: "qr_code" | "barcode" | "external_meeting_link" | "unknown_sensitive_pattern";
  content: string;
  confidence: number;
  pageNumber?: number;
  region?: FindingCoordinateRegion;
}

export interface ImageAnalysisResult {
  detections: ImageDetection[];
}

export interface MetadataProtectionResult {
  hiddenMetadataKeys: string[];
  embeddedLinks: string[];
}

export interface ArchiveInspectionResult {
  archiveDetected: boolean;
  nestedDepth: number;
  fileCount: number;
  suspicious: boolean;
}

export interface ProviderInvocationInput {
  fileName: string;
  declaredMimeType: string;
  byteSize: number;
  contentHash: string;
  mockTextContent?: string;
  mockImageSignals?: ImageDetection[];
  mockMetadataKeys?: string[];
}

export interface FileTypeDetectionProvider {
  providerName: AnalysisProviderName;
  detectFileType(input: ProviderInvocationInput): Promise<FileTypeDetectionResult>;
}

export interface OCRProtectionProvider {
  providerName: AnalysisProviderName;
  extractTextFromImage(input: ProviderInvocationInput): Promise<TextExtractionResult>;
}

export interface QRProtectionProvider {
  providerName: AnalysisProviderName;
  detectQr(input: ProviderInvocationInput): Promise<ImageAnalysisResult>;
}

export interface BarcodeProtectionProvider {
  providerName: AnalysisProviderName;
  detectBarcode(input: ProviderInvocationInput): Promise<ImageAnalysisResult>;
}

export interface PDFTextExtractionProvider {
  providerName: AnalysisProviderName;
  extractPdfText(input: ProviderInvocationInput): Promise<TextExtractionResult>;
}

export interface DOCXTextExtractionProvider {
  providerName: AnalysisProviderName;
  extractDocxText(input: ProviderInvocationInput): Promise<TextExtractionResult>;
}

export interface ImageAnalysisProvider {
  providerName: AnalysisProviderName;
  analyzeImage(input: ProviderInvocationInput): Promise<ImageAnalysisResult>;
}

export interface MetadataProtectionProvider {
  providerName: AnalysisProviderName;
  inspectMetadata(input: ProviderInvocationInput): Promise<MetadataProtectionResult>;
}

export interface ArchiveInspectionProvider {
  providerName: AnalysisProviderName;
  inspectArchive(input: ProviderInvocationInput): Promise<ArchiveInspectionResult>;
}

export interface AnalysisProviderSuite {
  fileTypeDetectionProvider: FileTypeDetectionProvider;
  ocrProtectionProvider: OCRProtectionProvider;
  qrProtectionProvider: QRProtectionProvider;
  barcodeProtectionProvider: BarcodeProtectionProvider;
  pdfTextExtractionProvider: PDFTextExtractionProvider;
  docxTextExtractionProvider: DOCXTextExtractionProvider;
  imageAnalysisProvider: ImageAnalysisProvider;
  metadataProtectionProvider: MetadataProtectionProvider;
  archiveInspectionProvider: ArchiveInspectionProvider;
}

export interface ProviderExecutionResult<T> {
  result: T;
  envelope: ProviderResultEnvelope;
}
