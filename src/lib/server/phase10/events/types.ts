import type { Phase10DecisionOrigin } from "../observability/index.ts";

export type Phase10DomainEventType =
  | "CandidateSelected"
  | "InterviewRequested"
  | "InterviewInvitationAccepted"
  | "CoordinationTermsAccepted"
  | "InterviewActivated"
  | "InterviewStarted"
  | "InterviewCompleted"
  | "ContactExchangeDetected"
  | "AttachmentQuarantined"
  | "ViolationCreated"
  | "ConversationFrozen"
  | "AppealSubmitted"
  | "HiringDecisionRecorded"
  | "ServiceFeeConfirmed"
  | "PaymentVerified"
  | "ContractUnlocked"
  | "ContractSigned"
  | "CandidateHired"
  | "InterviewReserved"
  | "ParticipantJoined"
  | "ParticipantLeft"
  | "InterviewCancelled"
  | "InterviewExpired"
  | "InterviewRescheduled"
  | "RoomClosed"
  | "RoomExpired";

export interface Phase10DomainEvent {
  eventId: string;
  eventType: Phase10DomainEventType;
  occurredAt: string;
  requestId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  organizationId?: string | null;
  tenantId?: string | null;
  conversationId?: string | null;
  interviewId?: string | null;
  messageId?: string | null;
  attachmentId?: string | null;
  paymentId?: string | null;
  contractId?: string | null;
  decisionOrigin: Phase10DecisionOrigin;
  payload: Record<string, unknown>;
}

export type Phase10DomainEventHandler = (event: Phase10DomainEvent) => void | Promise<void>;
