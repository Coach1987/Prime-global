import { randomUUID } from "node:crypto";
import { evaluatePhase10Policies } from "../policy-engine/index.ts";
import { evaluatePhase10BusinessRule } from "../rule-engine/index.ts";
import { createPhase10DomainEventBus } from "../events/index.ts";
import type { WorkflowCommandEnvelope, WorkflowExplainableResult } from "../workflow/index.ts";
import type { OrchestrationResult } from "../orchestrator/index.ts";
import type {
  InterviewAuditEntry,
  InterviewContext,
  InterviewLifecycleResult,
  InterviewParticipant,
  InterviewParticipantRole,
  InterviewRecord,
} from "./types.ts";
import { createInterviewLifecycleEvent } from "./events.ts";
import { authorizeParticipantRole, enforceInterviewPolicy } from "./policy.ts";
import type { ProtectedInterviewRepository } from "./repository.ts";
import type { VideoRoomProvider } from "./provider.ts";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["candidate_selected", "cancelled"],
  candidate_selected: ["invitation_created", "cancelled"],
  invitation_created: ["invitation_sent", "cancelled", "expired"],
  invitation_sent: ["candidate_accepted", "expired", "cancelled"],
  candidate_accepted: ["coordination_terms_accepted", "cancelled"],
  coordination_terms_accepted: ["interview_scheduled", "cancelled"],
  interview_scheduled: ["room_reserved", "cancelled", "expired"],
  room_reserved: ["interview_activated", "cancelled", "expired"],
  interview_activated: ["interview_started", "cancelled", "expired", "manual_review"],
  interview_started: ["interview_completed", "cancelled", "manual_review"],
  interview_completed: ["evaluation_pending", "manual_review"],
  evaluation_pending: ["evaluation_completed", "manual_review"],
  evaluation_completed: ["closed", "manual_review"],
  closed: [],
  cancelled: [],
  expired: [],
  manual_review: ["interview_activated", "cancelled", "expired"],
};

export interface ProtectedInterviewLifecycleDependencies {
  flags: {
    PROTECTED_INTERVIEW_ENABLED: boolean;
    VIDEO_ROOM_PROVIDER_ENABLED: boolean;
    INTERVIEW_TOKEN_ENABLED: boolean;
    INTERVIEW_LIFECYCLE_ENABLED: boolean;
  };
  repository: ProtectedInterviewRepository;
  roomProvider: VideoRoomProvider;
  workflowExecutor?: (command: WorkflowCommandEnvelope) => Promise<WorkflowExplainableResult>;
  orchestratorExecutor?: (input: { interview: InterviewRecord; targetNode: string; actorRole: string }) => Promise<OrchestrationResult>;
  now?: () => Date;
}

function deny(input: {
  interview: InterviewRecord;
  reason: string;
  errorCategory: string;
  requiredNextActions?: string[];
}): InterviewLifecycleResult {
  return {
    success: false,
    interviewId: input.interview.interviewId,
    previousState: input.interview.state,
    currentState: input.interview.state,
    previousVersion: input.interview.version,
    currentVersion: input.interview.version,
    events: [],
    timeline: [],
    evidenceReferences: [],
    blockingReasons: [input.reason],
    requiredNextActions: input.requiredNextActions ?? ["Resolve blocking conditions and retry."],
    humanReviewRequired: input.errorCategory === "manual_review_required",
    explanation: input.reason,
    errorCategory: input.errorCategory,
  };
}

function buildAudit(input: {
  interviewId: string;
  actorId: string;
  actorRole: string;
  organizationId: string;
  action: InterviewAuditEntry["action"];
  outcome: InterviewAuditEntry["outcome"];
  reason: string;
  metadata?: Record<string, unknown>;
  now: string;
}): InterviewAuditEntry {
  return {
    interviewId: input.interviewId,
    action: input.action,
    actorId: input.actorId,
    actorRole: input.actorRole,
    organizationId: input.organizationId,
    timestamp: input.now,
    outcome: input.outcome,
    reason: input.reason,
    metadata: input.metadata,
  };
}

function transitionAllowed(from: string, to: string): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

function toTimeline(interviewId: string, eventType: string, description: string, actorId: string, now: string) {
  return {
    workflowId: interviewId,
    eventType,
    description,
    actorId,
    timestamp: now,
    metadata: {},
  };
}

function toEvidence(interviewId: string, type: string, now: string) {
  return {
    workflowId: interviewId,
    referenceId: `${interviewId}:${type}:${now}`,
    evidenceType: type,
    timestamp: now,
    redactedMetadata: {
      referenceType: type,
    },
  };
}

export function createProtectedInterviewLifecycleService(dependencies: ProtectedInterviewLifecycleDependencies) {
  const bus = createPhase10DomainEventBus();

  async function saveTransition(input: {
    interview: InterviewRecord;
    context: InterviewContext;
    toState: InterviewRecord["state"];
    eventType: Parameters<typeof createInterviewLifecycleEvent>[0]["eventType"];
    explanation: string;
    auditAction?: InterviewAuditEntry["action"];
    auditReason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<InterviewLifecycleResult> {
    const now = (dependencies.now ?? (() => new Date()))().toISOString();

    if (!transitionAllowed(input.interview.state, input.toState)) {
      return deny({
        interview: input.interview,
        reason: `Invalid interview transition: ${input.interview.state} -> ${input.toState}`,
        errorCategory: "invalid_transition",
        requiredNextActions: ["Use a valid lifecycle transition."],
      });
    }

    const updated: InterviewRecord = {
      ...input.interview,
      state: input.toState,
      version: input.interview.version + 1,
      updatedAt: now,
    };

    await dependencies.repository.saveInterview(updated);

    const domainEvent = createInterviewLifecycleEvent({
      eventType: input.eventType,
      interviewId: updated.interviewId,
      actorId: input.context.actor.actorId,
      actorRole: input.context.actor.role,
      organizationId: updated.organizationId,
      tenantId: updated.tenantId,
      payload: input.metadata,
    });
    await bus.publish(domainEvent);

    const timeline = toTimeline(updated.interviewId, `interview.${input.eventType}`, input.explanation, input.context.actor.actorId, now);
    const evidenceReference = toEvidence(updated.interviewId, `interview_${input.eventType.toLowerCase()}`, now);

    await dependencies.repository.appendTimeline(timeline);
    await dependencies.repository.appendEvidence(evidenceReference);

    if (input.auditAction && input.auditReason) {
      await dependencies.repository.appendAudit(
        buildAudit({
          interviewId: updated.interviewId,
          actorId: input.context.actor.actorId,
          actorRole: input.context.actor.role,
          organizationId: updated.organizationId,
          action: input.auditAction,
          outcome: "success",
          reason: input.auditReason,
          metadata: input.metadata,
          now,
        })
      );
    }

    return {
      success: true,
      interviewId: updated.interviewId,
      previousState: input.interview.state,
      currentState: updated.state,
      previousVersion: input.interview.version,
      currentVersion: updated.version,
      events: [input.eventType],
      timeline: [timeline],
      evidenceReferences: [evidenceReference],
      blockingReasons: [],
      requiredNextActions: [],
      humanReviewRequired: false,
      explanation: input.explanation,
    };
  }

  return {
    async createDraft(input: {
      interviewId?: string;
      organizationId: string;
      tenantId?: string | null;
      candidateId?: string | null;
      employerId?: string | null;
      actorId: string;
      latestTermsVersion: string;
      participants?: InterviewParticipant[];
      metadata?: Record<string, unknown>;
    }): Promise<InterviewRecord> {
      const now = (dependencies.now ?? (() => new Date()))().toISOString();
      const record: InterviewRecord = {
        interviewId: input.interviewId ?? `int_${randomUUID()}`,
        organizationId: input.organizationId,
        tenantId: input.tenantId ?? null,
        candidateId: input.candidateId ?? null,
        employerId: input.employerId ?? null,
        createdBy: input.actorId,
        state: "draft",
        roomId: null,
        roomSessionVersion: 0,
        invitationAccepted: false,
        termsAcceptedVersion: null,
        latestTermsVersion: input.latestTermsVersion,
        policyApproved: false,
        ruleApproved: false,
        hasActiveFreeze: false,
        hasCriticalViolation: false,
        scheduledAt: null,
        startedAt: null,
        completedAt: null,
        closedAt: null,
        cancelledAt: null,
        expiredAt: null,
        rescheduleCount: 0,
        version: 0,
        createdAt: now,
        updatedAt: now,
        participants: input.participants ?? [],
        metadata: input.metadata ?? {},
      };
      await dependencies.repository.saveInterview(record);
      return record;
    },

    async selectCandidate(interviewId: string, context: InterviewContext) {
      const actual = await dependencies.repository.getInterview(interviewId);
      if (!actual) throw new Error("interview_not_found");
      if (
        context.actor.permissions.length > 0 &&
        !context.actor.permissions.includes("org:*") &&
        !context.actor.permissions.includes(`org:${actual.organizationId}`)
      ) {
        return deny({ interview: actual, reason: "cross organization access denied", errorCategory: "cross_organization_access_denied" });
      }
      return saveTransition({
        interview: actual,
        context,
        toState: "candidate_selected",
        eventType: "InterviewReserved",
        explanation: "Candidate selected for protected interview lifecycle.",
      });
    },

    async createInvitation(interviewId: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      return saveTransition({
        interview,
        context,
        toState: "invitation_created",
        eventType: "InterviewReserved",
        explanation: "Invitation created.",
      });
    },

    async sendInvitation(interviewId: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      await dependencies.repository.appendNotification({
        interviewId,
        category: "interview_invitation",
        title: "Interview invitation sent",
      });
      return saveTransition({
        interview,
        context,
        toState: "invitation_sent",
        eventType: "InterviewReserved",
        explanation: "Invitation sent.",
      });
    },

    async acceptInvitation(interviewId: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      interview.invitationAccepted = true;
      await dependencies.repository.saveInterview(interview);
      return saveTransition({
        interview,
        context,
        toState: "candidate_accepted",
        eventType: "InterviewReserved",
        explanation: "Candidate accepted invitation.",
      });
    },

    async acceptCoordinationTerms(interviewId: string, termsVersion: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      interview.termsAcceptedVersion = termsVersion;
      await dependencies.repository.saveInterview(interview);
      return saveTransition({
        interview,
        context,
        toState: "coordination_terms_accepted",
        eventType: "InterviewReserved",
        explanation: "Coordination terms accepted.",
      });
    },

    async scheduleInterview(interviewId: string, scheduledAt: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      interview.scheduledAt = scheduledAt;
      interview.policyApproved = true;
      interview.ruleApproved = true;
      await dependencies.repository.saveInterview(interview);

      if (dependencies.orchestratorExecutor) {
        await dependencies.orchestratorExecutor({
          interview,
          targetNode: "interview_workflow",
          actorRole: context.actor.role,
        });
      }

      return saveTransition({
        interview,
        context,
        toState: "interview_scheduled",
        eventType: "InterviewRescheduled",
        explanation: "Interview scheduled.",
      });
    },

    async reserveRoom(interviewId: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");

      if (!dependencies.flags.PROTECTED_INTERVIEW_ENABLED || !dependencies.flags.VIDEO_ROOM_PROVIDER_ENABLED || !dependencies.flags.INTERVIEW_LIFECYCLE_ENABLED) {
        return deny({ interview, reason: "Interview lifecycle feature disabled.", errorCategory: "feature_disabled" });
      }

      const policy = enforceInterviewPolicy({ interview, action: "reserve", metadata: interview.metadata });
      if (!policy.allowed) {
        return deny({ interview, reason: policy.reasons.join(" "), errorCategory: "policy_denied" });
      }

      const roomId = interview.roomId ?? `room_${interview.interviewId}`;
      let room;
      try {
        room = await dependencies.roomProvider.reserveRoom({
          roomId,
          interviewId: interview.interviewId,
          organizationId: interview.organizationId,
        });
      } catch (error) {
        return deny({
          interview,
          reason: error instanceof Error ? error.message : "room_reserve_failed",
          errorCategory: "room_reserve_failed",
        });
      }

      interview.roomId = room.roomId;
      interview.roomSessionVersion = room.sessionVersion;
      await dependencies.repository.saveInterview(interview);

      return saveTransition({
        interview,
        context,
        toState: "room_reserved",
        eventType: "InterviewReserved",
        explanation: "Room reserved for protected interview.",
      });
    },

    async activateInterview(interviewId: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");

      if (!dependencies.flags.PROTECTED_INTERVIEW_ENABLED || !dependencies.flags.INTERVIEW_LIFECYCLE_ENABLED) {
        return deny({ interview, reason: "Interview lifecycle feature disabled.", errorCategory: "feature_disabled" });
      }

      const organizationAllowed = context.actor.permissions.includes("org:*") || context.actor.permissions.includes(`org:${interview.organizationId}`);
      if (!organizationAllowed) {
        return deny({ interview, reason: "Organization scope verification failed.", errorCategory: "cross_organization_access_denied" });
      }

      const policyDecision = evaluatePhase10Policies(
        {
          actorRole: context.actor.role,
          action: "activate_interview",
          organization: {
            organizationId: interview.organizationId,
            organizationName: "Prime Global",
            tenantId: interview.tenantId,
            tenantName: interview.tenantId,
            isPrimeGlobalDefault: interview.tenantId === null,
          },
          facts: { candidateSelected: interview.state !== "draft" },
        },
        [
          {
            name: "stage6 interview activation policy",
            version: "1.0.0",
            scope: "interview",
            subjectRole: "*",
            action: "activate_interview",
            condition: () => ({
              passed: true,
              explanation: "Policy approved.",
              sourceCategories: ["stage6"],
              humanReviewRequired: false,
            }),
            severity: "low",
            enforcementAction: "allow",
            escalationRule: "none",
            enabled: true,
            effectiveAt: new Date().toISOString(),
            auditMetadata: {},
          },
        ]
      );

      const businessRule = evaluatePhase10BusinessRule(
        "Activate Interview",
        {
          actorId: context.actor.actorId,
          actorRole: context.actor.role,
          action: "activate_interview",
          organization: {
            organizationId: interview.organizationId,
            organizationName: "Prime Global",
            tenantId: interview.tenantId,
            tenantName: interview.tenantId,
            isPrimeGlobalDefault: interview.tenantId === null,
          },
          subjectId: interview.interviewId,
          subjectType: "interview",
          facts: {
            candidateSelected: ["candidate_selected", "invitation_created", "invitation_sent", "candidate_accepted", "coordination_terms_accepted", "interview_scheduled", "room_reserved", "interview_activated", "interview_started", "interview_completed", "evaluation_pending", "evaluation_completed", "closed"].includes(interview.state),
            invitationAccepted: interview.invitationAccepted,
            currentTermsAccepted: interview.termsAcceptedVersion === interview.latestTermsVersion,
            staffApproval: true,
            hasActiveFreeze: interview.hasActiveFreeze,
            videoRoomsEnabled: dependencies.flags.VIDEO_ROOM_PROVIDER_ENABLED,
          },
        }
      );

      const gatingErrors: string[] = [];
      if (!["room_reserved", "manual_review"].includes(interview.state)) gatingErrors.push("Workflow state invalid for activation.");
      if (!interview.invitationAccepted) gatingErrors.push("Invitation not accepted.");
      if (interview.termsAcceptedVersion !== interview.latestTermsVersion) gatingErrors.push("Latest coordination terms not accepted.");
      if (!policyDecision.allowed) gatingErrors.push("Policy Engine denied activation.");
      if (!businessRule.allowed) gatingErrors.push("Rule Engine denied activation.");
      if (interview.hasActiveFreeze) gatingErrors.push("Active freeze present.");
      if (interview.hasCriticalViolation) gatingErrors.push("Critical violation present.");

      if (gatingErrors.length > 0) {
        return deny({
          interview,
          reason: gatingErrors.join(" "),
          errorCategory: "activation_gate_failed",
          requiredNextActions: ["Satisfy all mandatory activation gates before retrying."],
        });
      }

      if (!interview.roomId) {
        return deny({ interview, reason: "Room must be reserved before activation.", errorCategory: "room_missing" });
      }

      try {
        await dependencies.roomProvider.activateRoom({
          roomId: interview.roomId,
          interviewId: interview.interviewId,
          organizationId: interview.organizationId,
        });
      } catch (error) {
        return deny({ interview, reason: error instanceof Error ? error.message : "Room activation failed", errorCategory: "room_activation_failed" });
      }

      interview.policyApproved = true;
      interview.ruleApproved = true;
      await dependencies.repository.saveInterview(interview);

      if (dependencies.workflowExecutor) {
        await dependencies.workflowExecutor({
          commandName: "ActivateInterviewCommand",
          commandVersion: "1.0.0",
          commandId: `cmd_${randomUUID()}`,
          idempotencyKey: context.idempotencyKey,
          correlationId: context.correlationId,
          causationId: context.causationId ?? null,
          actor: context.actor,
          organization: {
            organizationId: interview.organizationId,
            organizationName: "Prime Global",
            tenantId: interview.tenantId,
            tenantName: interview.tenantId,
            isPrimeGlobalDefault: interview.tenantId === null,
          },
          tenant: { tenantId: interview.tenantId ?? null, tenantName: interview.tenantId ?? null },
          workflowId: interview.interviewId,
          submittedAt: new Date().toISOString(),
          expectedVersion: interview.version,
          payload: { interviewId: interview.interviewId },
        });
      }

      return saveTransition({
        interview,
        context,
        toState: "interview_activated",
        eventType: "InterviewActivated",
        explanation: "Interview activated after mandatory gate validation.",
        auditAction: "activation",
        auditReason: "Interview activation succeeded",
      });
    },

    async issueJoinToken(interviewId: string, input: { participantId: string; participantRole: InterviewParticipantRole; organizationId: string }, context: InterviewContext) {
      void context;
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      if (!dependencies.flags.INTERVIEW_TOKEN_ENABLED) {
        throw new Error("token_feature_disabled");
      }
      if (!interview.roomId) {
        throw new Error("room_missing");
      }
      if (input.organizationId !== interview.organizationId) {
        throw new Error("cross_organization_join");
      }

      return dependencies.roomProvider.generateJoinToken({
        roomId: interview.roomId,
        participantId: input.participantId,
        participantRole: input.participantRole,
        organizationId: input.organizationId,
        interviewId,
        ttlSeconds: 300,
        sessionVersion: interview.roomSessionVersion,
      });
    },

    async joinInterview(interviewId: string, input: { participantId: string; participantRole: InterviewParticipantRole; organizationId: string; tokenExpiresAt: string }, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");

      if (!interview.roomId) return deny({ interview, reason: "Room not reserved.", errorCategory: "room_missing" });
      if (new Date(input.tokenExpiresAt).getTime() <= (dependencies.now ?? (() => new Date()))().getTime()) {
        return deny({ interview, reason: "Interview token expired.", errorCategory: "token_expired" });
      }
      if (input.organizationId !== interview.organizationId) {
        return deny({ interview, reason: "Cross organization join denied.", errorCategory: "cross_organization_access_denied" });
      }
      if (!authorizeParticipantRole(input.participantRole)) {
        return deny({ interview, reason: "Unauthorized participant role.", errorCategory: "unauthorized" });
      }

      const policy = enforceInterviewPolicy({
        interview,
        action: "join",
        participantRole: input.participantRole,
        metadata: interview.metadata,
      });
      if (!policy.allowed) {
        return deny({ interview, reason: policy.reasons.join(" "), errorCategory: "policy_denied" });
      }

      await dependencies.roomProvider.joinRoom({
        roomId: interview.roomId,
        participantId: input.participantId,
        role: input.participantRole,
      });

      if (interview.state === "interview_activated") {
        const started = await saveTransition({
          interview,
          context,
          toState: "interview_started",
          eventType: "InterviewStarted",
          explanation: "Interview started on first authorized join.",
        });
        const latest = await dependencies.repository.getInterview(interviewId);
        if (latest) {
          latest.startedAt = (dependencies.now ?? (() => new Date()))().toISOString();
          await dependencies.repository.saveInterview(latest);
        }
        await dependencies.repository.appendAudit(
          buildAudit({
            interviewId,
            actorId: context.actor.actorId,
            actorRole: context.actor.role,
            organizationId: interview.organizationId,
            action: "join",
            outcome: "success",
            reason: "Participant joined active interview",
            now: (dependencies.now ?? (() => new Date()))().toISOString(),
          })
        );
        return started;
      }

      await dependencies.repository.appendAudit(
        buildAudit({
          interviewId,
          actorId: context.actor.actorId,
          actorRole: context.actor.role,
          organizationId: interview.organizationId,
          action: "join",
          outcome: "success",
          reason: "Participant joined interview",
          now: (dependencies.now ?? (() => new Date()))().toISOString(),
        })
      );

      return {
        success: true,
        interviewId,
        previousState: interview.state,
        currentState: interview.state,
        previousVersion: interview.version,
        currentVersion: interview.version,
        events: ["ParticipantJoined"],
        timeline: [],
        evidenceReferences: [],
        blockingReasons: [],
        requiredNextActions: [],
        humanReviewRequired: false,
        explanation: "Participant joined.",
      };
    },

    async leaveInterview(interviewId: string, participantId: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview || !interview.roomId) throw new Error("interview_or_room_not_found");
      await dependencies.roomProvider.leaveRoom({ roomId: interview.roomId, participantId });
      await dependencies.repository.appendAudit(
        buildAudit({
          interviewId,
          actorId: context.actor.actorId,
          actorRole: context.actor.role,
          organizationId: interview.organizationId,
          action: "leave",
          outcome: "success",
          reason: "Participant left interview",
          now: (dependencies.now ?? (() => new Date()))().toISOString(),
        })
      );
      return {
        success: true,
        interviewId,
        previousState: interview.state,
        currentState: interview.state,
        previousVersion: interview.version,
        currentVersion: interview.version,
        events: ["ParticipantLeft"],
        timeline: [],
        evidenceReferences: [],
        blockingReasons: [],
        requiredNextActions: [],
        humanReviewRequired: false,
        explanation: "Participant left interview.",
      };
    },

    async completeInterview(interviewId: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      const completed = await saveTransition({
        interview,
        context,
        toState: "interview_completed",
        eventType: "InterviewCompleted",
        explanation: "Interview marked completed.",
      });
      const latest = await dependencies.repository.getInterview(interviewId);
      if (latest) {
        latest.completedAt = (dependencies.now ?? (() => new Date()))().toISOString();
        await dependencies.repository.saveInterview(latest);
      }
      return completed;
    },

    async markEvaluationPending(interviewId: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      return saveTransition({
        interview,
        context,
        toState: "evaluation_pending",
        eventType: "InterviewCompleted",
        explanation: "Evaluation pending.",
      });
    },

    async completeEvaluation(interviewId: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      return saveTransition({
        interview,
        context,
        toState: "evaluation_completed",
        eventType: "InterviewCompleted",
        explanation: "Evaluation completed.",
      });
    },

    async closeInterview(interviewId: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      if (interview.roomId) {
        await dependencies.roomProvider.closeRoom({ roomId: interview.roomId });
      }
      const closed = await saveTransition({
        interview,
        context,
        toState: "closed",
        eventType: "RoomClosed",
        explanation: "Interview lifecycle closed.",
      });
      const latest = await dependencies.repository.getInterview(interviewId);
      if (latest) {
        latest.closedAt = (dependencies.now ?? (() => new Date()))().toISOString();
        await dependencies.repository.saveInterview(latest);
      }
      return closed;
    },

    async cancelInterview(interviewId: string, reason: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      if (interview.roomId) {
        await dependencies.roomProvider.cancelRoom({ roomId: interview.roomId });
      }
      const result = await saveTransition({
        interview,
        context,
        toState: "cancelled",
        eventType: "InterviewCancelled",
        explanation: "Interview cancelled.",
        auditAction: "cancellation",
        auditReason: reason,
      });
      const latest = await dependencies.repository.getInterview(interviewId);
      if (latest) {
        latest.cancelledAt = (dependencies.now ?? (() => new Date()))().toISOString();
        await dependencies.repository.saveInterview(latest);
      }
      return result;
    },

    async expireInterview(interviewId: string, reason: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      if (interview.roomId) {
        await dependencies.roomProvider.expireRoom({ roomId: interview.roomId });
      }
      const result = await saveTransition({
        interview,
        context,
        toState: "expired",
        eventType: "InterviewExpired",
        explanation: "Interview expired.",
        auditAction: "expiration",
        auditReason: reason,
      });
      const latest = await dependencies.repository.getInterview(interviewId);
      if (latest) {
        latest.expiredAt = (dependencies.now ?? (() => new Date()))().toISOString();
        await dependencies.repository.saveInterview(latest);
      }
      return result;
    },

    async rescheduleInterview(interviewId: string, scheduledAt: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      interview.scheduledAt = scheduledAt;
      interview.rescheduleCount += 1;
      await dependencies.repository.saveInterview(interview);
      await dependencies.repository.appendAudit(
        buildAudit({
          interviewId,
          actorId: context.actor.actorId,
          actorRole: context.actor.role,
          organizationId: interview.organizationId,
          action: "reschedule",
          outcome: "success",
          reason: "Interview rescheduled",
          now: (dependencies.now ?? (() => new Date()))().toISOString(),
        })
      );
      return {
        success: true,
        interviewId,
        previousState: interview.state,
        currentState: interview.state,
        previousVersion: interview.version,
        currentVersion: interview.version,
        events: ["InterviewRescheduled"],
        timeline: [],
        evidenceReferences: [],
        blockingReasons: [],
        requiredNextActions: [],
        humanReviewRequired: false,
        explanation: "Interview rescheduled.",
      };
    },

    async moveToManualReview(interviewId: string, reason: string, context: InterviewContext) {
      const interview = await dependencies.repository.getInterview(interviewId);
      if (!interview) throw new Error("interview_not_found");
      const result = await saveTransition({
        interview,
        context,
        toState: "manual_review",
        eventType: "InterviewCancelled",
        explanation: "Interview moved to manual review.",
        auditAction: "manual_override",
        auditReason: reason,
      });
      return result;
    },

    async getInterview(interviewId: string) {
      return dependencies.repository.getInterview(interviewId);
    },
  };
}
