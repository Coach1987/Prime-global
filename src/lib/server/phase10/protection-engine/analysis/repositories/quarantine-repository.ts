import type { DocumentAnalysisQuarantine } from "../types.ts";

export interface DocumentAnalysisQuarantineRepository {
  save(record: DocumentAnalysisQuarantine): Promise<void>;
  getById(quarantineId: string): Promise<DocumentAnalysisQuarantine | null>;
  listExpiringBefore(timestamp: string): Promise<DocumentAnalysisQuarantine[]>;
}

export function createInMemoryDocumentAnalysisQuarantineRepository(): DocumentAnalysisQuarantineRepository {
  const records = new Map<string, DocumentAnalysisQuarantine>();

  return {
    async save(record) {
      records.set(record.quarantineId, record);
    },

    async getById(quarantineId) {
      return records.get(quarantineId) ?? null;
    },

    async listExpiringBefore(timestamp) {
      const target = new Date(timestamp).getTime();
      return Array.from(records.values()).filter((record) => new Date(record.expiryTimestamp).getTime() <= target);
    },
  };
}
