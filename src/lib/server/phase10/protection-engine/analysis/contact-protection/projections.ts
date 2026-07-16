import type {
  FalsePositiveRecord,
  FalsePositiveRepository,
  MessageProjectionRepository,
  ProtectedMessageProjection,
} from "./types.ts";

export function createInMemoryMessageProjectionRepository(): MessageProjectionRepository {
  const byMessageId = new Map<string, ProtectedMessageProjection>();
  return {
    async save(projection) {
      byMessageId.set(projection.messageId, projection);
    },
    async getByMessageId(messageId) {
      return byMessageId.get(messageId) ?? null;
    },
  };
}

export function createInMemoryFalsePositiveRepository(): FalsePositiveRepository {
  const items: FalsePositiveRecord[] = [];
  return {
    async append(record) {
      items.push(record);
    },
    async listByFindingHash(findingHash) {
      return items.filter((item) => item.findingHash === findingHash);
    },
  };
}
