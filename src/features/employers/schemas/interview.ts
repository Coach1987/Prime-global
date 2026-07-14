import { z } from "zod";

export const scheduleInterviewSchema = z.object({
  applicationId: z.string().uuid(),
  interviewType: z.enum(["online", "phone", "in_person"]),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(10).max(240).default(45),
  locationOrLink: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateInterviewSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  interviewType: z.enum(["online", "phone", "in_person"]).optional(),
  durationMinutes: z.number().int().min(10).max(240).optional(),
  locationOrLink: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(["scheduled", "rescheduled", "cancelled", "completed"]).optional(),
});
