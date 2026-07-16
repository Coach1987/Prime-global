import type { WorkflowActorContext, WorkflowEvidenceReference, WorkflowTimelineEvent } from "../workflow/index.ts";

export type InterviewLifecycleState =
  | "draft"
  | "candidate_selected"
  | "invitation_created"
  | "invitation_sent"
  | "candidate_accepted"
  | "coordination_terms_accepted"
  | "interview_scheduled"
  | "room_reserved"
  | "interview_activated"
  | "interview_started"
  | "interview_completed"
  | "evaluation_pending"
  | "evaluation_completed"
  | "closed"
  | "cancelled"
  | "expired"
  | "manual_review";

export type InterviewParticipantRole = "Candidate" | "Employer" | "Prime Recruiter" | "Prime Admin" | "Observer";

export interface InterviewParticipant {
  participantId: string;
  role: InterviewParticipantRole;
  organizationId: string;
}

export interface InterviewToken {
  tokenId: string;
  issued_at: string;
  expires_at: string;
  room_id: string;
  participant_id: string;
  participant_role: InterviewParticipantRole;
  organization_id: string;
  interview_id: string;
  session_version: number;
  signature_placeholder: string;
}

export interface InterviewRecord {
  interviewId: string;
  organizationId: string;
  tenantId: string | null;
  candidateId: string | null;
  employerId: string | null;
  createdBy: string;
  state: InterviewLifecycleState;
  roomId: string | null;
  roomSessionVersion: number;
  invitationAccepted: boolean;
  termsAcceptedVersion: string | null;
  latestTermsVersion: string;
  policyApproved: boolean;
  ruleApproved: boolean;
  hasActiveFreeze: boolean;
  hasCriticalViolation: boolean;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  rescheduleCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  participants: InterviewParticipant[];
  metadata: Record<string, unknown>;
}

export interface InterviewLifecycleResult {
  success: boolean;
  interviewId: string;
  previousState: InterviewLifecycleState;
  currentState: InterviewLifecycleState;
  previousVersion: number;
  currentVersion: number;
  events: string[];
  timeline: WorkflowTimelineEvent[];
  evidenceReferences: WorkflowEvidenceReference[];
  blockingReasons: string[];
  requiredNextActions: string[];
  humanReviewRequired: boolean;
  explanation: string;
  errorCategory?: string;
}

export interface InterviewAuditEntry {
  interviewId: string;
  action:
    | "activation"
    | "join"
    | "leave"
    | "cancellation"
    | "expiration"
    | "reschedule"
    | "manual_override";
  actorId: string;
  actorRole: string;
  organizationId: string;
  timestamp: string;
  outcome: "success" | "failure";
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface InterviewNotification {
  interviewId: string;
  category: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

export interface InterviewContext {
  actor: WorkflowActorContext;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
}
