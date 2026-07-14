import { z } from "zod";

export const generateContractSchema = z.object({
  offerId: z.string().uuid(),
});

export const signContractSchema = z.object({
  signature: z.string().trim().min(3).max(2000),
});
