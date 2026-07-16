import { createHash } from "node:crypto";
import type {
  CrossMessageReference,
  CrossMessageRepository,
  CrossMessageTokenRecord,
  MessageProtectionContext,
} from "./types.ts";

export function createInMemoryCrossMessageRepository(): CrossMessageRepository {
  const records: CrossMessageTokenRecord[] = [];
  return {
    async append(record) {
      records.push(record);
    },
    async listConversationWindow(conversationId, windowSize) {
      const scoped = records.filter((entry) => entry.conversationId === conversationId);
      return scoped.slice(Math.max(0, scoped.length - windowSize));
    },
  };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function detectCrossMessageLinks(input: {
  tokens: string[];
  messageId: string;
  context: MessageProtectionContext;
  repository: CrossMessageRepository;
  historyWindow: number;
}): Promise<CrossMessageReference[]> {
  const existing = await input.repository.listConversationWindow(input.context.conversationId, input.historyWindow);
  const references: CrossMessageReference[] = [];

  for (const token of input.tokens) {
    const tokenHash = hashToken(token);
    const matches = existing.filter((entry) => entry.tokenHash === tokenHash);
    for (const match of matches) {
      references.push({
        conversationId: match.conversationId,
        messageId: match.messageId,
        tokenHash,
      });
    }

    await input.repository.append({
      conversationId: input.context.conversationId,
      organizationId: input.context.organizationId,
      messageId: input.messageId,
      tokenHash,
      createdAt: new Date().toISOString(),
    });
  }

  return references;
}
