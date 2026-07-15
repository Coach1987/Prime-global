import type { Phase10DomainEvent } from "../../events/index.ts";
import { evaluatePhase10Policies } from "../../policy-engine/index.ts";
import { evaluatePhase10BusinessRule } from "../../rule-engine/index.ts";
import type { IdempotencyStore } from "../idempotency/index.ts";
import { hashIdempotencyPayload } from "../idempotency/index.ts";
import type { WorkflowLockProvider } from "../locking/index.ts";
import type { WorkflowRepository, WorkflowUnitOfWork } from "../persistence/index.ts";
import { createInitialWorkflowState, workflowStateMachineDefinitions } from "../state-machine/index.ts";
import type {
  WorkflowCommandEnvelope,
  WorkflowDomainHandler,
  WorkflowExplainableResult,
  WorkflowExecutionContext,
  WorkflowState,
  WorkflowTransitionRecord,
} from "../types/index.ts";
import { createWorkflowKernelError } from "../errors/index.ts";
import { createCompensationPlan } from "../compensation/index.ts";
import { createPhase10DomainEvent } from "../../events/index.ts";

export interface WorkflowExecutionPipelineDependencies {
  featureFlags: {
    WORKFLOW_KERNEL_ENABLED: boolean;
    WORKFLOW_COMMANDS_ENABLED: boolean;
    WORKFLOW_IDEMPOTENCY_ENABLED: boolean;
    WORKFLOW_LOCKING_ENABLED: boolean;
    WORKFLOW_OPTIMISTIC_LOCKING_ENABLED: boolean;
    WORKFLOW_COMPENSATION_ENABLED: boolean;
  };
  idempotencyStore: IdempotencyStore;
  lockProvider: WorkflowLockProvider;
  repository: WorkflowRepository;
  unitOfWork: WorkflowUnitOfWork;
  domainHandler: WorkflowDomainHandler;
  policyEvaluator?: (command: WorkflowCommandEnvelope) => ReturnType<typeof evaluatePhase10Policies>;
  businessRuleEvaluator?: (command: WorkflowCommandEnvelope) => ReturnType<typeof evaluatePhase10BusinessRule>;
  authorize: (command: WorkflowCommandEnvelope) => { allowed: boolean; reason: string };
  notificationAdapter: {
    enqueue: (events: Phase10DomainEvent[], correlationId: string) => Promise<void>;
  };
  timelineHandler: {
    append: (workflowId: string, eventType: string, description: string, actorId: string) => Promise<void>;
  };
  observability: {
    emit: (entry: {
      correlationId: string;
      commandId: string;
      workflowId: string;
      outcome: "success" | "failure";
      errorCode?: string;
      metadata?: Record<string, unknown>;
    }) => void;
  };
  idempotencyTtlMs?: number;
}

function failedResult(input: {
  command: WorkflowCommandEnvelope;
  errorCode: string;
  blockingReasons: string[];
  requiredNextActions: string[];
  message: string;
  previousState?: string | null;
  currentState?: string | null;
  previousVersion?: number | null;
  currentVersion?: number | null;
  policiesEvaluated?: string[];
  businessRulesEvaluated?: string[];
  failedConditions?: string[];
  humanReviewRequired?: boolean;
  compensationStatus?: WorkflowExplainableResult["compensationStatus"];
}): WorkflowExplainableResult {
  return {
    success: false,
    commandId: input.command.commandId,
    workflowId: input.command.workflowId,
    previousState: input.previousState ?? null,
    currentState: input.currentState ?? input.previousState ?? null,
    previousVersion: input.previousVersion ?? null,
    currentVersion: input.currentVersion ?? input.previousVersion ?? null,
    policiesEvaluated: input.policiesEvaluated ?? [],
    businessRulesEvaluated: input.businessRulesEvaluated ?? [],
    passedConditions: [],
    failedConditions: input.failedConditions ?? [input.message],
    blockingReasons: input.blockingReasons,
    requiredNextActions: input.requiredNextActions,
    eventsEmitted: [],
    compensationStatus: input.compensationStatus ?? "not_required",
    humanReviewRequired: input.humanReviewRequired ?? false,
    correlationId: input.command.correlationId,
    errorCode: input.errorCode,
  };
}

export async function executeWorkflowCommand(
  dependencies: WorkflowExecutionPipelineDependencies,
  command: WorkflowCommandEnvelope
): Promise<WorkflowExplainableResult> {
  let lockAcquired = false;
  const lockScope = {
    organizationId: command.organization.organizationId,
    tenantId: command.tenant.tenantId,
  };
  const lockOwner = `${command.actor.actorId}:${command.commandId}`;
  const compensationPlan = createCompensationPlan();

  try {
    // 1. validate command envelope
    if (!command.commandName || !command.commandVersion || !command.commandId || !command.idempotencyKey) {
      return failedResult({
        command,
        errorCode: "business_rule_failed",
        message: "Invalid command envelope",
        blockingReasons: ["invalid_command_envelope"],
        requiredNextActions: ["Provide all required command envelope fields."],
      });
    }

    // 2. resolve actor context
    if (!command.actor.authenticated) {
      return failedResult({
        command,
        errorCode: "unauthenticated",
        message: "Authentication required",
        blockingReasons: ["actor_not_authenticated"],
        requiredNextActions: ["Authenticate and retry."],
        humanReviewRequired: true,
      });
    }

    // 3. resolve organization or tenant context
    if (!command.organization.organizationId) {
      return failedResult({
        command,
        errorCode: "unauthorized",
        message: "Organization scope is required",
        blockingReasons: ["organization_scope_missing"],
        requiredNextActions: ["Submit a scoped organization context."],
      });
    }

    // 4. check feature flag
    if (!dependencies.featureFlags.WORKFLOW_KERNEL_ENABLED || !dependencies.featureFlags.WORKFLOW_COMMANDS_ENABLED) {
      return failedResult({
        command,
        errorCode: "feature_disabled",
        message: "Workflow command execution is disabled by feature flag",
        blockingReasons: ["feature_disabled"],
        requiredNextActions: ["Enable workflow kernel and command flags."],
      });
    }

    // 5. authorize role and ownership
    const authDecision = dependencies.authorize(command);
    if (!authDecision.allowed) {
      return failedResult({
        command,
        errorCode: "unauthorized",
        message: authDecision.reason,
        blockingReasons: [authDecision.reason],
        requiredNextActions: ["Use an authorized actor with the correct organization ownership."],
      });
    }

    // 6. evaluate Policy Engine
    const policyDecision =
      dependencies.policyEvaluator?.(command) ??
      evaluatePhase10Policies(
        {
          actorRole: command.actor.role,
          action: command.commandName,
          organization: command.organization,
          facts: {
            workflowId: command.workflowId,
          },
        },
        [
          {
            name: "workflow kernel foundation allow",
            version: "1.0.0",
            scope: "organization",
            subjectRole: "*",
            action: command.commandName,
            condition: () => ({
              passed: true,
              explanation: "Workflow kernel foundation policy passed.",
              sourceCategories: ["kernel-foundation"],
              confidence: 1,
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
    const policyNames = policyDecision.matchedPolicies.map((item) => item.policy.name);
    if (!policyDecision.allowed) {
      return failedResult({
        command,
        errorCode: "policy_denied",
        message: policyDecision.explanation,
        blockingReasons: policyDecision.blockingReasons,
        requiredNextActions: policyDecision.requiredNextActions,
        policiesEvaluated: policyNames,
      });
    }

    // 7. evaluate Business Rule Engine
    const businessRuleResult =
      dependencies.businessRuleEvaluator?.(command) ??
      evaluatePhase10BusinessRule(
        "Activate Interview",
        {
          actorId: command.actor.actorId,
          actorRole: command.actor.role,
          action: command.commandName,
          organization: command.organization,
          subjectId: command.workflowId,
          subjectType: "workflow",
          facts: {
            candidateSelected: true,
            invitationAccepted: true,
            currentTermsAccepted: true,
            staffApproval: true,
            hasActiveFreeze: false,
            videoRoomsEnabled: true,
          },
        },
        [
          {
            name: "Activate Interview",
            version: "1.0.0",
            requires: [],
            nextActions: [],
          },
        ]
      );
    if (!businessRuleResult.allowed) {
      return failedResult({
        command,
        errorCode: "business_rule_failed",
        message: businessRuleResult.explanation,
        blockingReasons: businessRuleResult.blockingReasons,
        requiredNextActions: businessRuleResult.requiredNextActions,
        businessRulesEvaluated: [businessRuleResult.ruleName],
        failedConditions: businessRuleResult.failedConditions.map((item) => item.reason),
      });
    }

    // 8. acquire idempotency protection
    if (dependencies.featureFlags.WORKFLOW_IDEMPOTENCY_ENABLED) {
      const payloadHash = hashIdempotencyPayload(command.payload);
      const started = await dependencies.idempotencyStore.start({
        key: command.idempotencyKey,
        scope: {
          organizationId: command.organization.organizationId,
          tenantId: command.tenant.tenantId,
          actorId: command.actor.actorId,
        },
        payloadHash,
        ttlMs: dependencies.idempotencyTtlMs ?? 5 * 60 * 1000,
      });

      if (!started.accepted) {
        if (started.reason === "completed" && started.record.result) {
          return started.record.result as WorkflowExplainableResult;
        }

        const mismatch = started.reason === "payload_mismatch";
        return failedResult({
          command,
          errorCode: "idempotency_conflict",
          message: mismatch ? "Idempotency key reuse with different payload." : "Idempotency record already exists.",
          blockingReasons: [mismatch ? "idempotency_payload_mismatch" : `idempotency_${started.reason}`],
          requiredNextActions: [
            mismatch
              ? "Use a new idempotency key when payload changes."
              : "Wait for the in-progress command or reuse the original request payload.",
          ],
        });
      }
    }

    // 9. acquire concurrency or aggregate lock
    if (dependencies.featureFlags.WORKFLOW_LOCKING_ENABLED) {
      const lock = await dependencies.lockProvider.acquire({
        key: command.workflowId,
        owner: lockOwner,
        scope: lockScope,
        leaseMs: 30_000,
      });
      if (!lock.acquired) {
        return failedResult({
          command,
          errorCode: "workflow_locked",
          message: lock.conflict.message,
          blockingReasons: ["workflow_locked"],
          requiredNextActions: ["Retry after lock lease expires or request lock owner release."],
        });
      }
      lockAcquired = true;
    }

    // 10. load current workflow state
    const existing = await dependencies.repository.getState(command.workflowId);
    const currentState = existing ?? createInitialWorkflowState("interview", command.workflowId);

    // 11. verify expected version
    if (
      dependencies.featureFlags.WORKFLOW_OPTIMISTIC_LOCKING_ENABLED &&
      typeof command.expectedVersion === "number" &&
      command.expectedVersion !== currentState.version
    ) {
      return failedResult({
        command,
        errorCode: "optimistic_concurrency_conflict",
        message: "Expected version does not match current workflow version.",
        blockingReasons: ["optimistic_concurrency_conflict"],
        requiredNextActions: ["Reload state and retry with current version."],
        previousState: currentState.currentState,
        currentState: currentState.currentState,
        previousVersion: currentState.version,
        currentVersion: currentState.version,
      });
    }

    // 12. execute domain handler
    const executionContext: WorkflowExecutionContext = {
      actor: command.actor,
      organization: command.organization,
      tenant: command.tenant,
      policyDecision,
      businessRuleResult,
    };
    const handlerResult = await dependencies.domainHandler.execute(command, existing, executionContext);

    const definition = workflowStateMachineDefinitions[handlerResult.workflowType];
    const allowed = definition.transitions.some(
      (entry) => entry.from === handlerResult.fromState && entry.to === handlerResult.toState
    );
    if (!allowed) {
      return failedResult({
        command,
        errorCode: "invalid_transition",
        message: `Invalid transition ${handlerResult.fromState} -> ${handlerResult.toState}`,
        blockingReasons: ["invalid_transition"],
        requiredNextActions: ["Use a transition defined for this workflow type."],
        previousState: currentState.currentState,
        currentState: currentState.currentState,
        previousVersion: currentState.version,
        currentVersion: currentState.version,
      });
    }

    const nextVersion = currentState.version + 1;
    const nextState: WorkflowState = {
      workflowType: handlerResult.workflowType,
      workflowId: command.workflowId,
      currentState: handlerResult.toState,
      version: nextVersion,
      metadata: {
        ...currentState.metadata,
        ...handlerResult.transitionMetadata,
      },
      updatedAt: new Date().toISOString(),
    };

    const transitionRecord: WorkflowTransitionRecord = {
      workflowType: handlerResult.workflowType,
      workflowId: command.workflowId,
      fromState: handlerResult.fromState,
      toState: handlerResult.toState,
      previousVersion: currentState.version,
      nextVersion,
      actor: command.actor,
      organization: command.organization,
      metadata: {
        commandName: command.commandName,
        commandVersion: command.commandVersion,
      },
      explanation: handlerResult.explanation,
      blockingReasons: handlerResult.blockingReasons,
      requiredNextActions: handlerResult.requiredNextActions,
      reversible: handlerResult.reversible,
      terminal: handlerResult.terminal,
      timestamp: new Date().toISOString(),
    };

    // 13. persist state atomically through an abstraction
    await dependencies.unitOfWork.runAtomic({
      workflowId: command.workflowId,
      state: nextState,
      transition: transitionRecord,
      events: handlerResult.events,
      audit: {
        workflowId: command.workflowId,
        commandId: command.commandId,
        actorId: command.actor.actorId,
        actorRole: command.actor.role,
        organizationId: command.organization.organizationId,
        tenantId: command.tenant.tenantId,
        outcome: "success",
        reason: handlerResult.explanation,
        timestamp: new Date().toISOString(),
        redactedMetadata: {
          commandName: command.commandName,
          payloadHash: hashIdempotencyPayload(command.payload),
        },
      },
      evidence: handlerResult.evidenceReference ?? null,
      timeline: handlerResult.timelineEvent ?? null,
      idempotencyCompletion: {
        key: command.idempotencyKey,
        organizationId: command.organization.organizationId,
        tenantId: command.tenant.tenantId,
        actorId: command.actor.actorId,
        status: "completed",
      },
    });

    // 14. append domain events (already included in atomic write)
    // 15. write audit entry (already included in atomic write)
    // 16. append evidence reference where applicable (already included in atomic write)

    // 17. update timeline through an event handler
    if (handlerResult.timelineEvent) {
      await dependencies.timelineHandler.append(
        command.workflowId,
        handlerResult.timelineEvent.eventType,
        handlerResult.timelineEvent.description,
        command.actor.actorId
      );
      compensationPlan.register({
        step: "timeline_append",
        irreversible: false,
        execute: async () => {
          return;
        },
      });
    }

    // 18. enqueue notifications through an adapter
    await dependencies.notificationAdapter.enqueue(handlerResult.events, command.correlationId);
    compensationPlan.register({
      step: "notification_enqueue",
      irreversible: false,
      execute: async () => {
        return;
      },
    });

    // 19. emit structured observability data
    dependencies.observability.emit({
      correlationId: command.correlationId,
      commandId: command.commandId,
      workflowId: command.workflowId,
      outcome: "success",
      metadata: {
        commandName: command.commandName,
        eventsEmitted: handlerResult.events.length,
      },
    });

    const successResult: WorkflowExplainableResult = {
      success: true,
      commandId: command.commandId,
      workflowId: command.workflowId,
      previousState: handlerResult.fromState,
      currentState: handlerResult.toState,
      previousVersion: currentState.version,
      currentVersion: nextVersion,
      policiesEvaluated: policyNames,
      businessRulesEvaluated: [businessRuleResult.ruleName],
      passedConditions: businessRuleResult.passedConditions.map((item) => item.label),
      failedConditions: [],
      blockingReasons: handlerResult.blockingReasons,
      requiredNextActions: handlerResult.requiredNextActions,
      eventsEmitted: handlerResult.events.map((event) => event.eventType),
      compensationStatus: "not_required",
      humanReviewRequired: false,
      correlationId: command.correlationId,
    };

    if (dependencies.featureFlags.WORKFLOW_IDEMPOTENCY_ENABLED) {
      await dependencies.idempotencyStore.complete(command.idempotencyKey, {
        organizationId: command.organization.organizationId,
        tenantId: command.tenant.tenantId,
        actorId: command.actor.actorId,
      }, successResult);
    }

    return successResult;
  } catch (error) {
    const err = error instanceof Error ? error : new Error("unknown_workflow_failure");

    let compensationStatus: WorkflowExplainableResult["compensationStatus"] = "not_required";
    let reviewRequired = false;
    if (dependencies.featureFlags.WORKFLOW_COMPENSATION_ENABLED) {
      const compensationResult = await compensationPlan.run({
        workflowId: command.workflowId,
        commandId: command.commandId,
        actorId: command.actor.actorId,
        actorRole: command.actor.role,
        organizationId: command.organization.organizationId,
        tenantId: command.tenant.tenantId,
      });
      compensationStatus = compensationResult.status;
      reviewRequired = compensationResult.manualReviewRequired;
    }

    const known = createWorkflowKernelError({
      code: err.message.includes("persistence") ? "persistence_failure" : "event_handler_failure",
      message: "Workflow execution failed safely.",
      correlationId: command.correlationId,
      blockingReasons: ["safe_failure"],
      requiredNextActions: ["Inspect structured audit trail and retry only when safe."],
      details: {
        reason: err.message,
        commandName: command.commandName,
        payloadHash: hashIdempotencyPayload(command.payload),
      },
    });

    dependencies.observability.emit({
      correlationId: command.correlationId,
      commandId: command.commandId,
      workflowId: command.workflowId,
      outcome: "failure",
      errorCode: known.code,
      metadata: known.toPublicShape().details,
    });

    if (dependencies.featureFlags.WORKFLOW_IDEMPOTENCY_ENABLED) {
      await dependencies.idempotencyStore.fail(
        command.idempotencyKey,
        {
          organizationId: command.organization.organizationId,
          tenantId: command.tenant.tenantId,
          actorId: command.actor.actorId,
        },
        known.code
      );
    }

    return failedResult({
      command,
      errorCode: known.code,
      message: known.message,
      blockingReasons: known.blockingReasons,
      requiredNextActions: known.requiredNextActions,
      failedConditions: [known.message],
      humanReviewRequired: reviewRequired,
      compensationStatus,
    });
  } finally {
    // 20. release lock
    if (lockAcquired) {
      await dependencies.lockProvider.release(command.workflowId, lockOwner, lockScope);
    }
  }
}

export function createNoopWorkflowDomainHandler(nextState = "accepted"): WorkflowDomainHandler {
  return {
    async execute(command, currentState) {
      const fromState = currentState?.currentState ?? "requested";
      const event = createPhase10DomainEvent({
        eventType: "InterviewInvitationAccepted",
        actorId: command.actor.actorId,
        actorRole: command.actor.role,
        organizationId: command.organization.organizationId,
        tenantId: command.tenant.tenantId,
        interviewId: command.workflowId,
        decisionOrigin: "system_rule",
        payload: {
          commandName: command.commandName,
          workflowId: command.workflowId,
        },
      });

      return {
        workflowType: "interview",
        fromState,
        toState: nextState,
        explanation: "Workflow transitioned successfully.",
        blockingReasons: [],
        requiredNextActions: [],
        transitionMetadata: {
          commandName: command.commandName,
        },
        reversible: false,
        terminal: nextState === "completed",
        events: [event],
        evidenceReference: null,
        timelineEvent: {
          workflowId: command.workflowId,
          eventType: "workflow.transitioned",
          description: `Workflow moved from ${fromState} to ${nextState}`,
          timestamp: new Date().toISOString(),
          actorId: command.actor.actorId,
          metadata: { commandName: command.commandName },
        },
      };
    },
  };
}
