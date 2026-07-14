import { z } from "zod";

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  skill: z.string().trim().max(120).optional(),
  job: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  company: z.string().trim().max(160).optional(),
  language: z.string().trim().max(120).optional(),
  experience: z.string().trim().max(120).optional(),
  education: z.string().trim().max(120).optional(),
  salaryMin: z.coerce.number().nonnegative().optional(),
  visa: z.string().trim().max(120).optional(),
  nationality: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(30).default(12),
});
