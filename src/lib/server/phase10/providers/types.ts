export interface Phase10VideoProvider {
  getJoinToken(input: { roomId: string; participantId: string; role: string }): Promise<{ token: string; expiresAt: string }>;
  createRoom?(input: { roomId: string; subject: string }): Promise<{ providerRoomId: string }>;
  endRoom?(input: { roomId: string }): Promise<void>;
}

export interface Phase10PaymentProvider {
  createPaymentIntent(input: { amount: number; currency: string; reference: string }): Promise<{ providerReference: string; clientSecret?: string }>;
  verifyPayment(input: { providerReference: string }): Promise<{ verified: boolean; verifiedAt?: string }>;
}

export interface Phase10AIProvider {
  summarize(input: { source: string; locale: "en" | "ar" }): Promise<{ summary: string; confidence: number }>;
  recommend?(input: { source: string; goal: string }): Promise<{ recommendation: string; confidence: number }>;
}

export interface Phase10OCRProvider {
  extractText(input: { fileName: string; mimeType: string; data: Buffer }): Promise<{ text: string; confidence: number }>;
}

export interface Phase10QRCodeScanner {
  scan(input: { fileName: string; mimeType: string; data: Buffer }): Promise<{ codes: string[] }>;
}

export interface Phase10AttachmentScanner {
  scan(input: { fileName: string; mimeType: string; sizeBytes: number; data?: Buffer }): Promise<{
    allowed: boolean;
    reasons: string[];
    confidence: number;
  }>;
}

export interface Phase10EmailProvider {
  send(input: { to: string; subject: string; body: string }): Promise<{ providerMessageId: string }>;
}

export interface Phase10StorageProvider {
  quarantine(input: { bucket: string; path: string; data: Buffer; contentType: string }): Promise<{ objectPath: string }>;
  release(input: { bucket: string; path: string }): Promise<void>;
  remove(input: { bucket: string; path: string }): Promise<void>;
}

export interface Phase10NotificationProvider {
  notify(input: {
    recipientId: string;
    category: string;
    title: string;
    body?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ notificationId: string }>;
}

export interface Phase10ProviderRegistry {
  video?: Phase10VideoProvider;
  payment?: Phase10PaymentProvider;
  ai?: Phase10AIProvider;
  ocr?: Phase10OCRProvider;
  qrCodeScanner?: Phase10QRCodeScanner;
  attachmentScanner?: Phase10AttachmentScanner;
  email?: Phase10EmailProvider;
  storage?: Phase10StorageProvider;
  notification?: Phase10NotificationProvider;
}
