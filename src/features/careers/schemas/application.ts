import { z } from "zod";

export const careerApplicationSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().min(6).max(24),
  email: z.string().email(),
  location: z.string().min(2).max(120),
  desiredPosition: z.string().min(2).max(120),
  yearsOfExperience: z.string().min(1).max(16),
  coverLetter: z.string().min(10).max(2000),
  acceptedTerms: z.boolean().refine((value) => value, {
    message: "acceptedTerms",
  }),
});

export const uploadConstraintsSchema = z.object({
  maxFileSizeMb: z.number().positive(),
  acceptedMimeTypes: z.array(z.string().min(1)).min(1),
});

export type CareerApplicationSchema = z.infer<typeof careerApplicationSchema>;