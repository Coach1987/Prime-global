import { z } from "zod";

export const companySizeValues = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

export const employerRegistrationSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  companyName: z.string().trim().min(2).max(180),
  commercialRegistrationNumber: z.string().trim().min(2).max(80),
  taxNumber: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(300),
  website: z.string().trim().url().max(320).optional().or(z.literal("")),
  companyEmail: z.string().trim().email().max(320),
  hrContact: z.string().trim().min(2).max(120),
  phoneNumber: z.string().trim().min(6).max(32),
  industry: z.string().trim().min(2).max(120),
  companySize: z.enum(companySizeValues),
  companyDescription: z.string().trim().min(20).max(4000),
});

export const employerLoginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

export const employerPasswordResetSchema = z.object({
  email: z.string().trim().email().max(320),
});

export const employerVerificationDocumentTypeSchema = z.enum([
  "commercial_registration",
  "tax_certificate",
  "legal_representative_id",
  "address_proof",
  "recruitment_license",
]);

export const employerProfileUpdateSchema = z.object({
  companyName: z.string().trim().min(2).max(180).optional(),
  country: z.string().trim().min(2).max(120).optional(),
  city: z.string().trim().min(2).max(120).optional(),
  address: z.string().trim().min(5).max(300).optional(),
  website: z.string().trim().url().max(320).optional().or(z.literal("")),
  companyEmail: z.string().trim().email().max(320).optional(),
  hrContact: z.string().trim().min(2).max(120).optional(),
  phoneNumber: z.string().trim().min(6).max(32).optional(),
  industry: z.string().trim().min(2).max(120).optional(),
  companySize: z.enum(companySizeValues).optional(),
  companyDescription: z.string().trim().min(20).max(4000).optional(),
  logoStoragePath: z.string().trim().min(3).max(500).optional(),
});

export type EmployerRegistrationInput = z.infer<typeof employerRegistrationSchema>;
