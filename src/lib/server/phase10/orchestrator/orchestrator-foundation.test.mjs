import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  createProtectedRecruitmentGraphFoundation,
  validateOrchestrationGraph,
  runSagaSteps,
  createInMemoryOrchestrationSnapshotRepository,
  createOrchestrationRecoveryService,
  evaluateTimeoutPolicy,
  orchestratorTimeoutPolicyFoundations,
  defaultOrchestratorRetryPolicy,
  evaluateRetryPolicy,
  createInMemorySchedulerProvider,
  hashScheduledPayload,
  createManualInterventionService,
  createOrchestrationInspector,
  createVisualizationProjection,
  createOrchestrationEventConsumer,
  projectReplayState,
  createInMemoryOrchestrationUnitOfWork,
  createInMemoryOrchestrationLeaseProvider,
  createInMemoryLongRunningStateStore,
  toLongRunningState,
  createOrchestratorError,
  createOrchestrationStateFactory,
  createOrchestrationGraph,
  executeOrchestrationStep,
} from "./index.ts";
import { createInMemoryIdempotencyStore, hashIdempotencyPayload } from "../workflow/index.ts";

test("valid orchestration graph passes validation", () => {
  const graph = createProtectedRecruitmentGraphFoundation();
  const result = validateOrchestrationGraph(graph);
  assert.equal(result.valid, true);
});

test("missing node rejection", () => {
  const graph = createOrchestrationGraph({ nodes: [], edges: [], terminalNodeIds: ["done"] });
  const result = validateOrchestrationGraph(graph);
  assert.equal(result.valid, false);
  assert.equal(result.issues.some((entry) => entry.code === "missing_nodes"), true);
});

test("invalid edge rejection", () => {
  const graph = createOrchestrationGraph({
    edges: [{ edgeId: "bad", fromNodeId: "missing", toNodeId: "done" }],
  });
  const result = validateOrchestrationGraph(graph);
  assert.equal(result.issues.some((entry) => entry.code === "invalid_edges"), true);
});

test("unreachable node detection", () => {
  const graph = createOrchestrationGraph({
    nodes: [
      ...createOrchestrationGraph().nodes,
      {
        nodeId: "never",
        nodeType: "workflow",
        workflowType: "interview",
        requiredCommand: null,
        requiredQuery: null,
        allowedRoles: ["prime_global_recruiter"],
        requiredPolicies: [],
        requiredBusinessRules: [],
        timeoutMs: null,
        retryPolicyId: null,
        compensationNodeId: null,
        visibilityScope: "recruiter",
        evidenceRequired: true,
        auditRequired: true,
        humanReviewRequired: false,
        irreversible: false,
        featureFlag: null,
      },
    ],
  });
  const result = validateOrchestrationGraph(graph);
  assert.equal(result.issues.some((entry) => entry.code === "unreachable_nodes"), true);
});

test("cycle rejection unless explicitly allowed", () => {
  const base = createOrchestrationGraph({
    edges: [
      { edgeId: "a", fromNodeId: "start", toNodeId: "done" },
      { edgeId: "b", fromNodeId: "done", toNodeId: "start" },
    ],
    allowCycles: false,
  });
  const denied = validateOrchestrationGraph(base);
  assert.equal(denied.issues.some((entry) => entry.code === "cycle_not_allowed"), true);

  const allowed = validateOrchestrationGraph({ ...base, allowCycles: true });
  assert.equal(allowed.issues.some((entry) => entry.code === "cycle_not_allowed"), false);
});

test("valid saga completion", async () => {
  const calls = [];
  const result = await runSagaSteps(
    [
      {
        stepId: "s1",
        stepName: "one",
        stepVersion: "1",
        invocation: "invoke:one",
        prerequisites: [],
        successCriteria: [],
        timeoutMs: null,
        retryPolicy: { maxAttempts: 1, delayMs: 0 },
        compensationAction: async () => {
          calls.push("c1");
        },
        irreversible: false,
        manualReviewRequired: false,
        evidenceRequired: true,
        auditRequired: true,
        nextStepId: "s2",
        failureStepId: null,
        skippable: false,
        resultMetadata: {},
      },
      {
        stepId: "s2",
        stepName: "two",
        stepVersion: "1",
        invocation: "invoke:two",
        prerequisites: ["s1"],
        successCriteria: [],
        timeoutMs: null,
        retryPolicy: { maxAttempts: 1, delayMs: 0 },
        compensationAction: async () => {
          calls.push("c2");
        },
        irreversible: false,
        manualReviewRequired: false,
        evidenceRequired: true,
        auditRequired: true,
        nextStepId: null,
        failureStepId: null,
        skippable: false,
        resultMetadata: {},
      },
    ],
    async () => {}
  );

  assert.equal(result.status, "completed");
  assert.deepEqual(result.completedSteps, ["s1", "s2"]);
  assert.equal(calls.length, 0);
});

test("saga failure and reverse compensation", async () => {
  const calls = [];
  const result = await runSagaSteps(
    [
      {
        stepId: "s1",
        stepName: "one",
        stepVersion: "1",
        invocation: "invoke:one",
        prerequisites: [],
        successCriteria: [],
        timeoutMs: null,
        retryPolicy: { maxAttempts: 1, delayMs: 0 },
        compensationAction: async () => {
          calls.push("compensate-s1");
        },
        irreversible: false,
        manualReviewRequired: false,
        evidenceRequired: true,
        auditRequired: true,
        nextStepId: "s2",
        failureStepId: null,
        skippable: false,
        resultMetadata: {},
      },
      {
        stepId: "s2",
        stepName: "two",
        stepVersion: "1",
        invocation: "invoke:two",
        prerequisites: [],
        successCriteria: [],
        timeoutMs: null,
        retryPolicy: { maxAttempts: 1, delayMs: 0 },
        compensationAction: null,
        irreversible: false,
        manualReviewRequired: false,
        evidenceRequired: true,
        auditRequired: true,
        nextStepId: null,
        failureStepId: null,
        skippable: false,
        resultMetadata: {},
      },
    ],
    async (step) => {
      if (step.stepId === "s2") throw new Error("fail");
    }
  );

  assert.equal(result.status, "compensated");
  assert.deepEqual(calls, ["compensate-s1"]);
});

test("irreversible saga step requires manual review", async () => {
  const result = await runSagaSteps(
    [
      {
        stepId: "s1",
        stepName: "one",
        stepVersion: "1",
        invocation: "invoke:one",
        prerequisites: [],
        successCriteria: [],
        timeoutMs: null,
        retryPolicy: { maxAttempts: 1, delayMs: 0 },
        compensationAction: null,
        irreversible: true,
        manualReviewRequired: true,
        evidenceRequired: true,
        auditRequired: true,
        nextStepId: null,
        failureStepId: null,
        skippable: false,
        resultMetadata: {},
      },
    ],
    async () => {
      throw new Error("irreversible failure");
    }
  );

  assert.equal(result.status, "manual_review");
  assert.equal(result.manualReviewRequired, true);
});

test("durable snapshot save and restore", async () => {
  const repository = createInMemoryOrchestrationSnapshotRepository();
  const state = createOrchestrationStateFactory();

  const saved = await repository.save({
    orchestrationId: state.identity.orchestrationId,
    orchestrationState: state,
    graphVersion: "1.0.0",
    currentNodeId: state.currentNodeId,
    completedNodes: [state.currentNodeId],
    pendingNodes: [],
    failedNodes: [],
    compensatedNodes: [],
    orchestrationVersion: 1,
    eventCursor: { sequence: 1, eventId: null },
    retryState: { attempts: 0, nextRetryAt: null },
    timeoutState: { timeoutAt: null, expired: false },
    scheduledActionState: { nextActionAt: null },
    humanInterventionState: { required: false, reason: null },
  });

  const loaded = await repository.load(state.identity.orchestrationId);
  assert.equal(loaded.integrityHash, saved.integrityHash);
});

test("snapshot version conflict", async () => {
  const repository = createInMemoryOrchestrationSnapshotRepository();
  const state = createOrchestrationStateFactory();

  await repository.save({
    orchestrationId: state.identity.orchestrationId,
    orchestrationState: state,
    graphVersion: "1.0.0",
    currentNodeId: state.currentNodeId,
    completedNodes: [],
    pendingNodes: [],
    failedNodes: [],
    compensatedNodes: [],
    orchestrationVersion: 3,
    eventCursor: { sequence: 1, eventId: null },
    retryState: { attempts: 0, nextRetryAt: null },
    timeoutState: { timeoutAt: null, expired: false },
    scheduledActionState: { nextActionAt: null },
    humanInterventionState: { required: false, reason: null },
  });

  const cas = await repository.compareAndSwap(state.identity.orchestrationId, 1, {
    orchestrationId: state.identity.orchestrationId,
    orchestrationState: state,
    graphVersion: "1.0.0",
    currentNodeId: state.currentNodeId,
    completedNodes: [],
    pendingNodes: [],
    failedNodes: [],
    compensatedNodes: [],
    orchestrationVersion: 4,
    eventCursor: { sequence: 2, eventId: null },
    retryState: { attempts: 0, nextRetryAt: null },
    timeoutState: { timeoutAt: null, expired: false },
    scheduledActionState: { nextActionAt: null },
    humanInterventionState: { required: false, reason: null },
  });

  assert.equal(cas.ok, false);
});

test("snapshot integrity failure is detected", async () => {
  const repository = createInMemoryOrchestrationSnapshotRepository();
  const state = createOrchestrationStateFactory();
  const saved = await repository.save({
    orchestrationId: state.identity.orchestrationId,
    orchestrationState: state,
    graphVersion: "1.0.0",
    currentNodeId: state.currentNodeId,
    completedNodes: [],
    pendingNodes: [],
    failedNodes: [],
    compensatedNodes: [],
    orchestrationVersion: 1,
    eventCursor: { sequence: 1, eventId: null },
    retryState: { attempts: 0, nextRetryAt: null },
    timeoutState: { timeoutAt: null, expired: false },
    scheduledActionState: { nextActionAt: null },
    humanInterventionState: { required: false, reason: null },
  });

  const tampered = { ...saved, integrityHash: "tampered" };
  const verification = repository.verify(tampered);
  assert.equal(verification.valid, false);
});

test("restart recovery restores healthy snapshot", async () => {
  const snapshots = createInMemoryOrchestrationSnapshotRepository();
  const state = createOrchestrationStateFactory();

  await snapshots.save({
    orchestrationId: state.identity.orchestrationId,
    orchestrationState: state,
    graphVersion: "1.0.0",
    currentNodeId: state.currentNodeId,
    completedNodes: [],
    pendingNodes: [],
    failedNodes: [],
    compensatedNodes: [],
    orchestrationVersion: 1,
    eventCursor: { sequence: 1, eventId: null },
    retryState: { attempts: 0, nextRetryAt: null },
    timeoutState: { timeoutAt: null, expired: false },
    scheduledActionState: { nextActionAt: null },
    humanInterventionState: { required: false, reason: null },
  });

  const service = createOrchestrationRecoveryService({
    snapshots,
    readCurrentStates: async () => [state],
  });

  const recovered = await service.recover(state.identity.orchestrationId);
  assert.equal(recovered.state, "recovered");
});

test("stale lease recovery allows reacquisition", async () => {
  const leases = createInMemoryOrchestrationLeaseProvider();
  const orchestrationId = `orch:${randomUUID()}`;
  await leases.acquire(orchestrationId, "owner-a", 0);
  const reacquired = await leases.acquire(orchestrationId, "owner-b", 1000);
  assert.equal(reacquired.acquired, true);
});

test("duplicate execution prevention with idempotency", async () => {
  const store = createInMemoryIdempotencyStore();
  const scope = { organizationId: "prime-global", tenantId: null, actorId: "staff-1" };
  const key = "orch:dup";

  const first = await store.start({
    key,
    scope,
    payloadHash: hashIdempotencyPayload({ orchestrationId: "o1" }),
    ttlMs: 1000,
  });
  const second = await store.start({
    key,
    scope,
    payloadHash: hashIdempotencyPayload({ orchestrationId: "o1" }),
    ttlMs: 1000,
  });

  assert.equal(first.accepted, true);
  assert.equal(second.accepted, false);
});

test("long-running waiting state appears in due list only when due", async () => {
  const store = createInMemoryLongRunningStateStore();
  const state = toLongRunningState(createOrchestrationStateFactory());
  state.nextActionAt = new Date(Date.now() + 60_000).toISOString();
  await store.save(state);

  const dueNow = await store.listDue(new Date());
  assert.equal(dueNow.length, 0);

  const dueLater = await store.listDue(new Date(Date.now() + 61_000));
  assert.equal(dueLater.length, 1);
});

test("timeout scheduling and expiry", () => {
  const policy = orchestratorTimeoutPolicyFoundations[0];
  const startedAt = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();

  const result = evaluateTimeoutPolicy(policy, { startedAt, now: new Date() });
  assert.equal(result.expired, true);
  assert.equal(result.escalationRequired, true);
});

test("retry success decision", () => {
  const decision = evaluateRetryPolicy(
    defaultOrchestratorRetryPolicy,
    {
      attempts: 1,
      startedAt: new Date().toISOString(),
      nextRetryAt: null,
      exhausted: false,
    },
    "provider_timeout",
    new Date()
  );
  assert.equal(decision.retry, true);
});

test("retry exhaustion decision", () => {
  const decision = evaluateRetryPolicy(
    defaultOrchestratorRetryPolicy,
    {
      attempts: 10,
      startedAt: new Date(Date.now() - 1000).toISOString(),
      nextRetryAt: null,
      exhausted: false,
    },
    "provider_timeout",
    new Date()
  );
  assert.equal(decision.retry, false);
  assert.equal(decision.exhausted, true);
});

test("non-retryable error is denied", () => {
  const decision = evaluateRetryPolicy(
    defaultOrchestratorRetryPolicy,
    {
      attempts: 0,
      startedAt: new Date().toISOString(),
      nextRetryAt: null,
      exhausted: false,
    },
    "unauthorized",
    new Date()
  );
  assert.equal(decision.retry, false);
  assert.equal(decision.manualReviewRequired, true);
});

test("scheduled action claim and conflict", async () => {
  const scheduler = createInMemorySchedulerProvider();
  const actionId = `act:${randomUUID()}`;
  await scheduler.scheduleOnce({
    actionId,
    orchestrationId: "orch-1",
    nodeId: "node-1",
    correlationId: "corr-1",
    idempotencyKey: "idem-1",
    scope: { organizationId: "prime-global", tenantId: null },
    scheduledAt: new Date(Date.now() - 1000).toISOString(),
    timeoutAt: null,
    payloadHash: hashScheduledPayload({ x: 1 }),
    privacySafeMetadata: { safe: true },
  });

  const due = await scheduler.listDueActions(new Date());
  assert.equal(due.length, 1);

  const firstClaim = await scheduler.claimAction(actionId, "worker-a", 5000);
  assert.equal(firstClaim.status, "claimed");

  const secondClaim = await scheduler.claimAction(actionId, "worker-b", 5000);
  assert.equal(secondClaim, null);
});

test("manual pause and resume", async () => {
  const store = createInMemoryLongRunningStateStore();
  const state = toLongRunningState(createOrchestrationStateFactory());
  await store.save(state);

  const paused = await store.suspend(state.orchestrationId);
  const resumed = await store.resume(state.orchestrationId);

  assert.equal(paused, true);
  assert.equal(resumed, true);
});

test("unauthorized intervention denial", async () => {
  const service = createManualInterventionService();
  const orchestration = createOrchestrationStateFactory();

  await assert.rejects(
    service.intervene(
      {
        orchestrationId: orchestration.identity.orchestrationId,
        action: "pause",
        staffIdentity: "candidate-1",
        staffRole: "candidate",
        organizationId: orchestration.scope.organizationId,
        reasonCode: "test",
        justification: "x",
        evidenceReferences: [],
        previousState: "running",
        nextState: "waiting",
        timestamp: new Date().toISOString(),
        appealEligibility: false,
        notificationState: "not_required",
        policyEvaluationResult: "allowed",
        followUpAction: "none",
        nextReviewAt: null,
        idempotencyKey: "idem-1",
      },
      orchestration
    )
  );
});

test("cross-organization intervention denial", async () => {
  const service = createManualInterventionService();
  const orchestration = createOrchestrationStateFactory();

  await assert.rejects(
    service.intervene(
      {
        orchestrationId: orchestration.identity.orchestrationId,
        action: "pause",
        staffIdentity: "staff-1",
        staffRole: "prime_global_admin",
        organizationId: "other-org",
        reasonCode: "test",
        justification: "x",
        evidenceReferences: [],
        previousState: "running",
        nextState: "waiting",
        timestamp: new Date().toISOString(),
        appealEligibility: false,
        notificationState: "not_required",
        policyEvaluationResult: "allowed",
        followUpAction: "none",
        nextReviewAt: null,
        idempotencyKey: "idem-1",
      },
      orchestration
    )
  );
});

test("role-shaped inspector output hides staff data externally", async () => {
  const inspector = createOrchestrationInspector();
  const state = createOrchestrationStateFactory();
  const graph = createOrchestrationGraph();
  const shaped = inspector.inspect("candidate", {
    state,
    graph,
    snapshotHistory: [],
    recoveryHistory: [],
    interventions: [],
  });

  assert.equal(shaped.auditReferences.length, 0);
  assert.equal(shaped.evidenceReferences.length, 0);
  assert.equal(shaped.snapshotHistory.length, 0);
});

test("visualization projection returns graph state", () => {
  const graph = createOrchestrationGraph();
  const projection = createVisualizationProjection({
    graph,
    currentNode: "start",
    runtimeStates: [
      {
        nodeId: "start",
        status: "completed",
        enteredAt: new Date(Date.now() - 1000).toISOString(),
        exitedAt: new Date().toISOString(),
      },
      {
        nodeId: "done",
        status: "current",
      },
    ],
  });

  assert.equal(projection.nodes.length, graph.nodes.length);
  assert.equal(projection.currentNode, "start");
});

test("deterministic event ordering and duplicate/out-of-order detection", async () => {
  const consumer = createOrchestrationEventConsumer();
  const accepted = await consumer.consume({
    orchestrationId: "orch-1",
    orchestrationSequence: 1,
    workflowSequence: 1,
    correlationId: "corr-1",
    causationId: null,
    schemaVersion: 1,
    graphVersion: "1.0.0",
    eventId: "evt-1",
    eventType: "A",
    payload: {},
    occurredAt: new Date().toISOString(),
  });
  assert.equal(accepted.ordered, true);

  const duplicate = await consumer.consume({
    orchestrationId: "orch-1",
    orchestrationSequence: 1,
    workflowSequence: 1,
    correlationId: "corr-1",
    causationId: null,
    schemaVersion: 1,
    graphVersion: "1.0.0",
    eventId: "evt-1",
    eventType: "A",
    payload: {},
    occurredAt: new Date().toISOString(),
  });
  assert.equal(duplicate.duplicate, true);

  const outOfOrder = await consumer.consume({
    orchestrationId: "orch-1",
    orchestrationSequence: 1,
    workflowSequence: 2,
    correlationId: "corr-1",
    causationId: null,
    schemaVersion: 1,
    graphVersion: "1.0.0",
    eventId: "evt-2",
    eventType: "B",
    payload: {},
    occurredAt: new Date().toISOString(),
  });
  assert.equal(outOfOrder.outOfOrder, true);
});

test("replay-safe reconstruction is deterministic", () => {
  const state = projectReplayState(
    { count: 0 },
    [
      {
        orchestrationId: "o1",
        orchestrationSequence: 2,
        workflowSequence: 2,
        correlationId: "c",
        causationId: null,
        schemaVersion: 1,
        graphVersion: "1.0.0",
        eventId: "e2",
        eventType: "INC",
        payload: { by: 2 },
        occurredAt: new Date().toISOString(),
      },
      {
        orchestrationId: "o1",
        orchestrationSequence: 1,
        workflowSequence: 1,
        correlationId: "c",
        causationId: null,
        schemaVersion: 1,
        graphVersion: "1.0.0",
        eventId: "e1",
        eventType: "INC",
        payload: { by: 1 },
        occurredAt: new Date().toISOString(),
      },
    ],
    (current, event) => ({ count: current.count + event.payload.by })
  );

  assert.equal(state.count, 3);
});

test("atomic unit-of-work rollback on failure", async () => {
  const uow = createInMemoryOrchestrationUnitOfWork({ failStep: "domainEvents" });
  const state = createOrchestrationStateFactory();

  await assert.rejects(
    uow.runAtomic({
      orchestrationState: state,
      workflowCommandResult: {},
      workflowStateUpdate: {},
      sagaStepUpdate: {},
      snapshotAppend: {
        orchestrationId: state.identity.orchestrationId,
        orchestrationState: state,
        graphVersion: "1.0.0",
        currentNodeId: state.currentNodeId,
        completedNodes: [],
        pendingNodes: [],
        failedNodes: [],
        compensatedNodes: [],
        orchestrationVersion: 1,
        eventCursor: { sequence: 1, eventId: null },
        retryState: { attempts: 0, nextRetryAt: null },
        timeoutState: { timeoutAt: null, expired: false },
        scheduledActionState: { nextActionAt: null },
        humanInterventionState: { required: false, reason: null },
        integrityHash: "x",
        createdAt: new Date().toISOString(),
      },
      domainEvents: [{ eventType: "E", payload: {} }],
      auditReference: "a",
      evidenceReference: "e",
      timelineEvent: { eventType: "t", description: "d", timestamp: new Date().toISOString() },
      scheduledAction: null,
      idempotencyCompletion: { key: "i", status: "completed" },
      retryState: { attempts: 0, nextRetryAt: null },
      compensationState: { status: "not_required", steps: [] },
    })
  );

  const persisted = await uow.readState(state.identity.orchestrationId);
  assert.equal(persisted, null);
});

test("privacy-safe orchestrator error redacts sensitive details", () => {
  const error = createOrchestratorError({
    category: "recovery_failed",
    message: "failed",
    correlationId: "corr-1",
    blockingReasons: ["x"],
    requiredNextActions: ["y"],
    details: {
      token: "secret",
      email: "user@example.com",
      safe: "ok",
    },
  });

  const shape = error.toPublicShape();
  assert.equal(shape.details.token, "[redacted]");
  assert.equal(shape.details.email, "[redacted]");
  assert.equal(shape.details.safe, "ok");
});

test("orchestration execution central coordinator advances only through graph edges", async () => {
  const orchestration = createOrchestrationStateFactory();
  const graph = createOrchestrationGraph();
  const uow = createInMemoryOrchestrationUnitOfWork();

  const result = await executeOrchestrationStep({
    dependencies: {
      flags: {
        RECRUITMENT_ORCHESTRATOR_ENABLED: true,
        ORCHESTRATION_SAGAS_ENABLED: true,
        ORCHESTRATION_GRAPHS_ENABLED: true,
        ORCHESTRATION_SNAPSHOTS_ENABLED: true,
      },
      unitOfWork: uow,
      authorize: ({ actorRole }) => actorRole === "prime_global_recruiter",
    },
    orchestration,
    graph,
    actorRole: "prime_global_recruiter",
    targetNodeId: "done",
  });

  assert.equal(result.success, true);

  await assert.rejects(
    executeOrchestrationStep({
      dependencies: {
        flags: {
          RECRUITMENT_ORCHESTRATOR_ENABLED: true,
          ORCHESTRATION_SAGAS_ENABLED: true,
          ORCHESTRATION_GRAPHS_ENABLED: true,
          ORCHESTRATION_SNAPSHOTS_ENABLED: true,
        },
        unitOfWork: uow,
        authorize: () => true,
      },
      orchestration: createOrchestrationStateFactory(),
      graph,
      actorRole: "prime_global_recruiter",
      targetNodeId: "missing-node",
    })
  );
});
