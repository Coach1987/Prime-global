import { z } from "zod";

export const employmentTypeSchema = z.enum(["full_time", "part_time", "contract", "internship"]);
export const workModeSchema = z.enum(["remote", "hybrid", "onsite"]);
export const jobStatusSchema = z.enum(["draft", "published", "paused", "closed"]);

export const createJobSchema = z.object({
  title: z.string().trim().min(2).max(180),
  department: z.string().trim().min(2).max(120),
  employmentType: employmentTypeSchema,
  workMode: workModeSchema,
  country: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  salaryMin: z.number().nonnegative().max(1_000_000).nullable().optional(),
  salaryMax: z.number().nonnegative().max(1_000_000).nullable().optional(),
  salaryCurrency: z.string().trim().min(3).max(8).default("USD"),
  experience: z.string().trim().min(2).max(120),
  education: z.string().trim().min(2).max(120),
  requiredSkills: z.array(z.string().trim().min(1).max(80)).max(30),
  responsibilities: z.string().trim().min(10).max(6000),
  requirements: z.string().trim().min(10).max(6000),
  benefits: z.string().trim().max(3000).optional(),
  applicationDeadline: z.string().datetime().optional(),
  status: jobStatusSchema.default("draft"),
  publishDate: z.string().datetime().optional(),
});

export const updateJobSchema = createJobSchema.partial();

export const listPublicJobsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  keyword: z.string().trim().max(120).optional(),
  profession: z.string().trim().max(120).optional(),
  specialization: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  skill: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(120).optional(),
  employmentType: employmentTypeSchema.optional(),
  workMode: workModeSchema.optional(),
  minSalary: z.coerce.number().nonnegative().optional(),
  experience: z.string().trim().max(120).optional(),
  sort: z.enum(["newest", "relevant", "highest_salary"]).default("newest"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(12),
});

export const applyToJobSchema = z.object({
  jobId: z.string().uuid(),
  resumeId: z.string().uuid().optional(),
  coverLetter: z.string().trim().min(10).max(3000).optional(),
});
