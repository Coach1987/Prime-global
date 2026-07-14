import { z } from "zod";

export const candidateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phoneNumber: z.string().trim().min(6).max(32).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  professionalTitle: z.string().trim().min(2).max(160).optional().or(z.literal("")),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(["new", "reviewing", "interview", "shortlisted", "accepted", "rejected"]),
  note: z.string().trim().max(1200).optional(),
});
