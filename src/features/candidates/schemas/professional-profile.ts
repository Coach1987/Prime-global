import { z } from "zod";

const experienceItemSchema = z.object({
  company: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(160),
  startDate: z.string().trim().min(4).max(32),
  endDate: z.string().trim().max(32).optional(),
  summary: z.string().trim().max(1200).optional(),
});

const educationItemSchema = z.object({
  institution: z.string().trim().min(2).max(160),
  degree: z.string().trim().min(2).max(160),
  year: z.string().trim().min(2).max(32),
});

const certificateItemSchema = z.object({
  title: z.string().trim().min(2).max(180),
  issuer: z.string().trim().min(2).max(160),
  year: z.string().trim().max(32).optional(),
});

export const candidateProfessionalProfileSchema = z.object({
  photoStoragePath: z.string().trim().max(500).optional().or(z.literal("")),
  headline: z.string().trim().max(180).optional().or(z.literal("")),
  biography: z.string().trim().max(3000).optional().or(z.literal("")),
  experiences: z.array(experienceItemSchema).max(50).default([]),
  educationEntries: z.array(educationItemSchema).max(50).default([]),
  certificates: z.array(certificateItemSchema).max(50).default([]),
  skills: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  languages: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  portfolioUrl: z.string().trim().url().max(320).optional().or(z.literal("")),
  linkedInUrl: z.string().trim().url().max(320).optional().or(z.literal("")),
  websiteUrl: z.string().trim().url().max(320).optional().or(z.literal("")),
  availability: z.string().trim().max(120).optional().or(z.literal("")),
  salaryExpectation: z.number().nonnegative().max(5_000_000).optional(),
  visaStatus: z.string().trim().max(120).optional().or(z.literal("")),
  drivingLicense: z.boolean().optional(),
  nationality: z.string().trim().max(120).optional().or(z.literal("")),
});
