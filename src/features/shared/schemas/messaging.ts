import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
  attachmentStoragePath: z.string().trim().max(500).optional().or(z.literal("")),
});
