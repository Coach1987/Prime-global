import type { InterviewAuditEntry, InterviewNotification, InterviewRecord } from "./types.ts";
import type { WorkflowEvidenceReference, WorkflowTimelineEvent } from "../workflow/index.ts";

export interface ProtectedInterviewRepository {
  saveInterview(record: InterviewRecord): Promise<void>;
  getInterview(interviewId: string): Promise<InterviewRecord | null>;
  appendAudit(entry: InterviewAuditEntry): Promise<void>;
  appendEvidence(reference: WorkflowEvidenceReference): Promise<void>;
  appendTimeline(event: WorkflowTimelineEvent): Promise<void>;
  appendNotification(notification: InterviewNotification): Promise<void>;
  listAudit(interviewId: string): Promise<InterviewAuditEntry[]>;
  listTimeline(interviewId: string): Promise<WorkflowTimelineEvent[]>;
  listEvidence(interviewId: string): Promise<WorkflowEvidenceReference[]>;
  listNotifications(interviewId: string): Promise<InterviewNotification[]>;
}

export function createInMemoryProtectedInterviewRepository(): ProtectedInterviewRepository {
  const interviews = new Map<string, InterviewRecord>();
  const audit: InterviewAuditEntry[] = [];
  const evidence: WorkflowEvidenceReference[] = [];
  const timeline: WorkflowTimelineEvent[] = [];
  const notifications: InterviewNotification[] = [];

  return {
    async saveInterview(record) {
      interviews.set(record.interviewId, record);
    },

    async getInterview(interviewId) {
      return interviews.get(interviewId) ?? null;
    },

    async appendAudit(entry) {
      audit.push(entry);
    },

    async appendEvidence(reference) {
      evidence.push(reference);
    },

    async appendTimeline(event) {
      timeline.push(event);
    },

    async appendNotification(notification) {
      notifications.push(notification);
    },

    async listAudit(interviewId) {
      return audit.filter((entry) => entry.interviewId === interviewId);
    },

    async listTimeline(interviewId) {
      return timeline.filter((entry) => entry.workflowId === interviewId);
    },

    async listEvidence(interviewId) {
      return evidence.filter((entry) => entry.workflowId === interviewId);
    },

    async listNotifications(interviewId) {
      return notifications.filter((entry) => entry.interviewId === interviewId);
    },
  };
}
