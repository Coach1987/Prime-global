import { z } from "zod";

export const createOfferSchema = z.object({
  applicationId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  compensation: z.number().nonnegative().max(10_000_000).optional(),
  currency: z.string().trim().min(3).max(8).default("USD"),
  startDate: z.string().trim().max(40).optional(),
  terms: z.string().trim().max(6000).optional(),
});

export const respondOfferSchema = z.object({
  action: z.enum(["accepted", "rejected", "changes_requested"]),
  response: z.string().trim().max(4000).optional(),
});
