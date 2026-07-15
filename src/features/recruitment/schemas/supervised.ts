import { z } from "zod";

export const recruitmentConversationRequestSchema = z.object({
  candidateId: z.string().uuid(),
  relatedJobId: z.string().uuid().optional().nullable(),
  relatedApplicationId: z.string().uuid().optional().nullable(),
  requestedMessage: z.string().trim().min(10).max(2000),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

export const recruitmentConversationRequestActionSchema = z.object({
  action: z.enum(["assign", "approve", "reject"]),
  assignedStaffUserId: z.string().uuid().optional(),
  rejectionReason: z.string().trim().max(1200).optional(),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

export const recruitmentConversationResponseSchema = z.object({
  action: z.enum(["accept", "decline"]),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

export const recruitmentConversationMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  locale: z.enum(["en", "ar"]).optional().default("en"),
  attachments: z
    .array(
      z.object({
        fileName: z.string().trim().min(1).max(200),
        mimeType: z.string().trim().min(1).max(120),
        fileSizeBytes: z.number().int().positive().max(10485760),
        storageBucket: z.string().trim().min(1).max(120),
        storageObjectPath: z.string().trim().min(1).max(500),
      })
    )
    .max(5)
    .optional()
    .default([]),
});

export const recruitmentConversationUpdateSchema = z.object({
  status: z.enum(["active", "paused", "closed", "archived"]).optional(),
  conversationMode: z.enum(["staff_active", "ai_supervised", "awaiting_staff", "closed"]).optional(),
  recruitmentStage: z
    .enum(["conversation_requested", "candidate_review", "active_dialogue", "interview_planning", "interview_live", "offer_review", "closed"])
    .optional(),
  pausedReason: z.string().trim().max(500).optional().nullable(),
  closureReason: z.string().trim().max(1000).optional().nullable(),
  assignedStaffUserId: z.string().uuid().optional(),
  escalatedToAdmin: z.boolean().optional(),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

export const recruitmentAiSupervisorActionSchema = z.object({
  action: z.enum(["assist", "handover", "set_awaiting_staff", "set_staff_active"]),
  taskType: z
    .enum([
      "process_qna",
      "candidate_job_summary",
      "availability_collection",
      "interview_suggestion",
      "reminder",
      "escalation",
      "handover_summary",
      "follow_up_task",
    ])
    .optional(),
  message: z.string().trim().max(2000).optional(),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

export const recruitmentInternalNoteSchema = z.object({
  note: z.string().trim().min(2).max(4000),
});

export const recruitmentInterviewCreateSchema = z.object({
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(10).max(240).default(45),
  waitingRoomEnabled: z.boolean().optional().default(true),
  cameraEnabled: z.boolean().optional().default(true),
  microphoneEnabled: z.boolean().optional().default(true),
  screenSharingEnabled: z.boolean().optional().default(true),
  interviewNotes: z.string().trim().max(2000).optional().nullable(),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

export const recruitmentInterviewUpdateSchema = z.object({
  status: z.enum(["scheduled", "waiting", "live", "completed", "cancelled", "no_show"]).optional(),
  interviewResult: z.string().trim().max(1000).optional().nullable(),
  interviewNotes: z.string().trim().max(4000).optional().nullable(),
  scheduledAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(10).max(240).optional(),
  hostAction: z.enum(["start", "end"]).optional(),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

export const recruitmentModerationActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});