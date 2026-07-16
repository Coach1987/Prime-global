import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  createInMemoryIdempotencyStore,
  createInMemoryWorkflowLockProvider,
  createInMemoryWorkflowRepository,
  createNoopWorkflowDomainHandler,
  executeWorkflowCommand,
  executeKernelQuery,
  createCompensationPlan,
  orderWorkflowEvents,
  replayWorkflowState,
  runSideEffects,
  createInMemoryDeadLetterQueue,
  createWorkflowKernelError,
  createWorkflowCommand,
  createWorkflowActor,
  createWorkflowOrganization,
} from "./index.ts";
import { createPhase10DomainEvent } from "../events/index.ts";
import { sanitizePhase10LogEntry } from "../observability/index.ts";

function createDependencies(overrides = {}) {
  const persistence = createInMemoryWorkflowRepository();
  const idempotencyStore = createInMemoryIdempotencyStore();
  const lockProvider = createInMemoryWorkflowLockProvider();
  const logs = [];

  return {
    persistence,
    idempotencyStore,
    lockProvider,
    logs,
    deps: {
      featureFlags: {
        WORKFLOW_KERNEL_ENABLED: true,
        WORKFLOW_COMMANDS_ENABLED: true,
        WORKFLOW_QUERIES_ENABLED: true,
        WORKFLOW_IDEMPOTENCY_ENABLED: true,
        WORKFLOW_LOCKING_ENABLED: true,
        WORKFLOW_OPTIMISTIC_LOCKING_ENABLED: true,
        WORKFLOW_COMPENSATION_ENABLED: true,
        WORKFLOW_EVENT_REPLAY_ENABLED: true,
      },
      idempotencyStore,
      lockProvider,
      repository: persistence.repository,
      unitOfWork: persistence.unitOfWork,
      domainHandler: createNoopWorkflowDomainHandler("accepted"),
      authorize: () => ({ allowed: true, reason: "authorized" }),
      notificationAdapter: {
        enqueue: async () => {
          return;
        },
      },
      timelineHandler: {
        append: async () => {
          return;
        },
      },
      observability: {
        emit: (entry) => logs.push(entry),
      },
      ...overrides,
    },
  };
}

test("valid state transition succeeds", async () => {
  const { deps } = createDependencies();
  const command = createWorkflowCommand();
  const result = await executeWorkflowCommand(deps, command);

  assert.equal(result.success, true);
  assert.equal(result.previousState, "requested");
  assert.equal(result.currentState, "accepted");
});

test("invalid state transition fails with structured error", async () => {
  const { deps } = createDependencies({
    domainHandler: createNoopWorkflowDomainHandler("completed"),
  });
  const result = await executeWorkflowCommand(deps, createWorkflowCommand());

  assert.equal(result.success, false);
  assert.equal(result.errorCode, "invalid_transition");
});

test("policy denial blocks command", async () => {
  const { deps } = createDependencies({
    policyEvaluator: () => ({
      allowed: false,
      matchedPolicies: [{ policy: { name: "deny policy" }, passed: false, explanation: "denied", sourceCategories: [], humanReviewRequired: false }],
      blockingReasons: ["policy_denied"],
      requiredNextActions: ["obtain approval"],
      explanation: "Denied",
    }),
  });

  const result = await executeWorkflowCommand(deps, createWorkflowCommand());
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "policy_denied");
});

test("business rule failure blocks command", async () => {
  const { deps } = createDependencies({
    businessRuleEvaluator: () => ({
      ruleName: "Activate Interview",
      version: "1.0.0",
      allowed: false,
      passedConditions: [],
      failedConditions: [{ key: "x", label: "x", satisfied: false, reason: "rule failed" }],
      blockingReasons: ["rule failed"],
      requiredNextActions: ["fix rule"],
      explanation: "blocked",
      context: {},
    }),
  });

  const result = await executeWorkflowCommand(deps, createWorkflowCommand());
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "business_rule_failed");
});

test("feature flag disabled returns feature_disabled", async () => {
  const { deps } = createDependencies();
  deps.featureFlags.WORKFLOW_KERNEL_ENABLED = false;

  const result = await executeWorkflowCommand(deps, createWorkflowCommand());
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "feature_disabled");
});

test("command idempotency returns original result on duplicate payload", async () => {
  const { deps } = createDependencies();
  const command = createWorkflowCommand({ idempotencyKey: "same-key", payload: { invitationId: "inv-1" } });
  const first = await executeWorkflowCommand(deps, command);
  const second = await executeWorkflowCommand(deps, command);

  assert.equal(first.success, true);
  assert.equal(second.success, true);
  assert.equal(second.commandId, first.commandId);
});

test("idempotency payload mismatch is rejected", async () => {
  const { deps } = createDependencies();
  const first = createWorkflowCommand({ idempotencyKey: "same-key", payload: { invitationId: "inv-1" } });
  const second = createWorkflowCommand({
    idempotencyKey: "same-key",
    payload: { invitationId: "inv-2" },
    commandId: first.commandId,
    workflowId: first.workflowId,
    actor: first.actor,
    organization: first.organization,
    tenant: first.tenant,
  });

  await executeWorkflowCommand(deps, first);
  const result = await executeWorkflowCommand(deps, second);

  assert.equal(result.success, false);
  assert.equal(result.errorCode, "idempotency_conflict");
  assert.equal(result.blockingReasons.includes("idempotency_payload_mismatch"), true);
});

test("in-progress idempotency record is detected", async () => {
  const { deps, idempotencyStore } = createDependencies();
  const command = createWorkflowCommand({ idempotencyKey: "in-progress-key" });

  await idempotencyStore.start({
    key: command.idempotencyKey,
    scope: {
      organizationId: command.organization.organizationId,
      tenantId: command.tenant.tenantId,
      actorId: command.actor.actorId,
    },
    payloadHash: "fixed-hash",
    ttlMs: 60000,
  });

  const result = await executeWorkflowCommand(deps, command);
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "idempotency_conflict");
});

test("lock acquisition succeeds", async () => {
  const lockProvider = createInMemoryWorkflowLockProvider();
  const lock = await lockProvider.acquire({
    key: "workflow-1",
    owner: "owner-a",
    scope: { organizationId: "prime-global", tenantId: null },
    leaseMs: 1000,
  });

  assert.equal(lock.acquired, true);
});

test("lock conflict returns structured conflict", async () => {
  const lockProvider = createInMemoryWorkflowLockProvider();
  await lockProvider.acquire({
    key: "workflow-1",
    owner: "owner-a",
    scope: { organizationId: "prime-global", tenantId: null },
    leaseMs: 1000,
  });

  const conflict = await lockProvider.acquire({
    key: "workflow-1",
    owner: "owner-b",
    scope: { organizationId: "prime-global", tenantId: null },
    leaseMs: 1000,
  });

  assert.equal(conflict.acquired, false);
  assert.equal(conflict.conflict.code, "workflow_locked");
});

test("stale lock is recoverable", async () => {
  const lockProvider = createInMemoryWorkflowLockProvider();
  await lockProvider.acquire({
    key: "workflow-1",
    owner: "owner-a",
    scope: { organizationId: "prime-global", tenantId: null },
    leaseMs: 1,
  });

  await new Promise((resolve) => setTimeout(resolve, 5));

  const recovered = await lockProvider.acquire({
    key: "workflow-1",
    owner: "owner-b",
    scope: { organizationId: "prime-global", tenantId: null },
    leaseMs: 1000,
  });

  assert.equal(recovered.acquired, true);
});

test("optimistic version compare-and-swap success", async () => {
  const persistence = createInMemoryWorkflowRepository();
  const workflowId = "wf-optimistic";
  const initial = {
    workflowType: "interview",
    workflowId,
    currentState: "requested",
    version: 0,
    metadata: {},
    updatedAt: new Date().toISOString(),
  };
  const result = await persistence.repository.compareAndSwapState(workflowId, 0, initial);
  assert.equal(result.ok, true);
});

test("optimistic version conflict returns explanation", async () => {
  const persistence = createInMemoryWorkflowRepository();
  const workflowId = "wf-optimistic";
  await persistence.repository.compareAndSwapState(workflowId, 0, {
    workflowType: "interview",
    workflowId,
    currentState: "requested",
    version: 0,
    metadata: {},
    updatedAt: new Date().toISOString(),
  });

  const conflict = await persistence.repository.compareAndSwapState(workflowId, 1, {
    workflowType: "interview",
    workflowId,
    currentState: "accepted",
    version: 1,
    metadata: {},
    updatedAt: new Date().toISOString(),
  });

  assert.equal(conflict.ok, false);
  assert.match(conflict.explanation, /does not match/i);
});

test("atomic persistence success writes all records", async () => {
  const { deps, persistence } = createDependencies();
  const result = await executeWorkflowCommand(deps, createWorkflowCommand());

  assert.equal(result.success, true);
  assert.equal(persistence.snapshot.transitions.length, 1);
  assert.equal(persistence.snapshot.events.length, 1);
  assert.equal(persistence.snapshot.audit.length, 1);
});

test("persistence failure is returned safely", async () => {
  const failurePersistence = createInMemoryWorkflowRepository({ failOnStep: "events" });
  const { deps } = createDependencies({
    repository: failurePersistence.repository,
    unitOfWork: failurePersistence.unitOfWork,
  });

  const result = await executeWorkflowCommand(deps, createWorkflowCommand());
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "persistence_failure");
});

test("event ordering is deterministic by sequence", () => {
  const events = [3, 1, 2].map((sequence) => ({
    sequence,
    workflowId: "wf-1",
    workflowVersion: sequence,
    schemaVersion: 1,
    correlationId: "corr-1",
    causationId: null,
    event: createPhase10DomainEvent({
      eventType: "InterviewRequested",
      actorId: "actor-1",
      actorRole: "prime_global_recruiter",
      organizationId: "prime-global",
      decisionOrigin: "system_rule",
      payload: { sequence },
    }),
  }));

  const ordered = orderWorkflowEvents(events);
  assert.deepEqual(ordered.map((item) => item.sequence), [1, 2, 3]);
});

test("replay-safe state reconstruction remains pure", () => {
  const events = [
    {
      sequence: 1,
      workflowId: "wf-1",
      workflowVersion: 1,
      schemaVersion: 1,
      correlationId: "corr",
      causationId: null,
      event: createPhase10DomainEvent({
        eventType: "InterviewRequested",
        actorId: "a1",
        actorRole: "prime_global_recruiter",
        organizationId: "prime-global",
        decisionOrigin: "system_rule",
        payload: { toState: "requested" },
      }),
    },
    {
      sequence: 2,
      workflowId: "wf-1",
      workflowVersion: 2,
      schemaVersion: 1,
      correlationId: "corr",
      causationId: null,
      event: createPhase10DomainEvent({
        eventType: "InterviewInvitationAccepted",
        actorId: "a1",
        actorRole: "prime_global_recruiter",
        organizationId: "prime-global",
        decisionOrigin: "system_rule",
        payload: { toState: "accepted" },
      }),
    },
  ];

  const state = replayWorkflowState(
    { currentState: "none" },
    events,
    [
      {
        eventType: "InterviewRequested",
        apply: () => ({ currentState: "requested" }),
      },
      {
        eventType: "InterviewInvitationAccepted",
        apply: () => ({ currentState: "accepted" }),
      },
    ]
  );

  assert.equal(state.currentState, "accepted");
});

test("compensation executes in reverse order", async () => {
  const plan = createCompensationPlan();
  const calls = [];
  plan.register({ step: "one", irreversible: false, execute: async () => calls.push("one") });
  plan.register({ step: "two", irreversible: false, execute: async () => calls.push("two") });

  const result = await plan.run({
    workflowId: "wf-1",
    commandId: "cmd-1",
    actorId: "actor-1",
    actorRole: "prime_global_recruiter",
    organizationId: "prime-global",
    tenantId: null,
  });

  assert.deepEqual(calls, ["two", "one"]);
  assert.equal(result.status, "completed");
});

test("compensation partial completion is reported", async () => {
  const plan = createCompensationPlan();
  plan.register({ step: "one", irreversible: false, execute: async () => {} });
  plan.register({
    step: "two",
    irreversible: false,
    execute: async () => {
      throw new Error("fail");
    },
  });

  const result = await plan.run({
    workflowId: "wf-1",
    commandId: "cmd-1",
    actorId: "actor-1",
    actorRole: "prime_global_recruiter",
    organizationId: "prime-global",
    tenantId: null,
  });

  assert.equal(result.status, "partial");
});

test("irreversible compensation failure requires human review", async () => {
  const plan = createCompensationPlan();
  plan.register({
    step: "irreversible",
    irreversible: true,
    execute: async () => {
      throw new Error("cannot rollback");
    },
  });

  const result = await plan.run({
    workflowId: "wf-1",
    commandId: "cmd-1",
    actorId: "actor-1",
    actorRole: "prime_global_recruiter",
    organizationId: "prime-global",
    tenantId: null,
  });

  assert.equal(result.status, "manual_review");
  assert.equal(result.manualReviewRequired, true);
});

test("unauthorized command is denied", async () => {
  const { deps } = createDependencies({
    authorize: () => ({ allowed: false, reason: "role not permitted" }),
  });

  const result = await executeWorkflowCommand(deps, createWorkflowCommand());
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "unauthorized");
});

test("cross-organization query is denied", async () => {
  const actor = createWorkflowActor({ permissions: ["org:other-org"] });
  const organization = createWorkflowOrganization({ organizationId: "prime-global" });

  const query = {
    queryName: "GetRecruitmentWorkflowStateQuery",
    queryVersion: "1.0.0",
    correlationId: `corr:${randomUUID()}`,
    actor,
    organization,
    tenant: { tenantId: null, tenantName: null },
    params: { workflowId: "wf-1" },
    executeReadOnly: async (params) => params,
  };

  await assert.rejects(
    executeKernelQuery(
      {
        featureFlags: {
          WORKFLOW_KERNEL_ENABLED: true,
          WORKFLOW_QUERIES_ENABLED: true,
        },
      },
      query
    ),
    (error) => error.code === "unauthorized"
  );
});

test("privacy-safe errors and logs redact sensitive fields", () => {
  const error = createWorkflowKernelError({
    code: "persistence_failure",
    message: "failed",
    correlationId: "corr-1",
    blockingReasons: ["x"],
    requiredNextActions: ["y"],
    details: { token: "secret-token", paymentCredentials: "card", safe: "ok" },
  }).toPublicShape();

  assert.equal(error.details.token, "[redacted]");
  assert.equal(error.details.paymentCredentials, "[redacted]");
  assert.equal(error.details.safe, "ok");

  const log = sanitizePhase10LogEntry({
    requestId: "req-1",
    eventId: "evt-1",
    result: "error",
    decisionOrigin: "system_rule",
    metadata: { privateCv: "raw-cv", contactDetails: "secret", safe: "ok" },
  });

  assert.equal(log.metadata.privateCv, "[redacted]");
  assert.equal(log.metadata.contactDetails, "[redacted]");
  assert.equal(log.metadata.safe, "ok");
});

test("duplicate command execution reuses idempotent result", async () => {
  const { deps } = createDependencies();
  const command = createWorkflowCommand({ idempotencyKey: "dup-key", payload: { invitationId: "same" } });

  const first = await executeWorkflowCommand(deps, command);
  const second = await executeWorkflowCommand(deps, command);

  assert.equal(first.success, true);
  assert.equal(second.success, true);
  assert.equal(second.currentVersion, first.currentVersion);
});

test("query executor enforces purity with read-only params", async () => {
  const actor = createWorkflowActor({ permissions: ["org:prime-global"] });
  const organization = createWorkflowOrganization();

  const query = {
    queryName: "GetWorkflowAuditQuery",
    queryVersion: "1.0.0",
    correlationId: `corr:${randomUUID()}`,
    actor,
    organization,
    tenant: { tenantId: null, tenantName: null },
    params: { list: [] },
    executeReadOnly: async (params) => {
      assert.throws(() => {
        params.list.push("mutate");
      });
      return { ok: true };
    },
  };

  const result = await executeKernelQuery(
    {
      featureFlags: {
        WORKFLOW_KERNEL_ENABLED: true,
        WORKFLOW_QUERIES_ENABLED: true,
      },
    },
    query
  );

  assert.equal(result.result.ok, true);
});

test("failed side-effect handlers are routed to dead letter", async () => {
  const queue = createInMemoryDeadLetterQueue();
  const event = {
    sequence: 1,
    workflowId: "wf-1",
    workflowVersion: 1,
    schemaVersion: 1,
    correlationId: "corr",
    causationId: null,
    event: createPhase10DomainEvent({
      eventType: "InterviewRequested",
      actorId: "actor-1",
      actorRole: "prime_global_recruiter",
      organizationId: "prime-global",
      decisionOrigin: "system_rule",
      payload: {},
    }),
  };

  await runSideEffects(
    [event],
    [
      {
        eventType: "InterviewRequested",
        handle: async () => {
          throw new Error("handler failure");
        },
      },
    ],
    queue
  );

  const deadLetters = await queue.list();
  assert.equal(deadLetters.length, 1);
  assert.match(deadLetters[0].reason, /handler failure/i);
});
