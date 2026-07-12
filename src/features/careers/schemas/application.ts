import { z } from "zod";

export const careerApplicationSchema = z.object({
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(60),
  nationality: z.string().min(2).max(80),
  country: z.string().min(2).max(80),
  currentLocation: z.string().min(2).max(120),
  phone: z.string().min(6).max(24),
  whatsapp: z.string().min(6).max(24),
  email: z.string().email(),
  desiredPosition: z.string().min(2).max(120),
  yearsOfExperience: z.string().min(1).max(16),
  education: z.string().min(2).max(120),
  languages: z.string().min(2).max(240),
  currentEmployer: z.string().max(120).optional().or(z.literal("")),
  expectedSalary: z.string().max(80).optional().or(z.literal("")),
  availableFrom: z.string().min(1),
  coverLetter: z.string().max(2000).optional().or(z.literal("")),
  acceptedTerms: z.boolean().refine((value) => value, {
    message: "acceptedTerms",
  }),
});

export const uploadConstraintsSchema = z.object({
  maxFileSizeMb: z.number().positive(),
  acceptedMimeTypes: z.array(z.string().min(1)).min(1),
});

export type CareerApplicationSchema = z.infer<typeof careerApplicationSchema>;