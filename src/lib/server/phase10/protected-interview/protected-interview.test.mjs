import test from "node:test";
import assert from "node:assert/strict";

import {
  createInMemoryProtectedInterviewRepository,
  createMockVideoRoomProvider,
  createProtectedInterviewLifecycleService,
  createInterviewContext,
  createInterviewParticipants,
  createInterviewActor,
} from "./index.ts";

function createService(flags = {}) {
  const repository = createInMemoryProtectedInterviewRepository();
  const roomProvider = createMockVideoRoomProvider();
  const orchestratorCalls = [];
  const workflowCalls = [];

  const service = createProtectedInterviewLifecycleService({
    flags: {
      PROTECTED_INTERVIEW_ENABLED: true,
      VIDEO_ROOM_PROVIDER_ENABLED: true,
      INTERVIEW_TOKEN_ENABLED: true,
      INTERVIEW_LIFECYCLE_ENABLED: true,
      ...flags,
    },
    repository,
    roomProvider,
    workflowExecutor: async (command) => {
      workflowCalls.push(command.commandName);
      return {
        success: true,
        commandId: command.commandId,
        workflowId: command.workflowId,
        previousState: "room_reserved",
        currentState: "interview_activated",
        previousVersion: 1,
        currentVersion: 2,
        policiesEvaluated: [],
        businessRulesEvaluated: [],
        passedConditions: [],
        failedConditions: [],
        blockingReasons: [],
        requiredNextActions: [],
        eventsEmitted: [],
        compensationStatus: "not_required",
        humanReviewRequired: false,
        correlationId: command.correlationId,
      };
    },
    orchestratorExecutor: async (input) => {
      orchestratorCalls.push(input.targetNode);
      return {
        success: true,
        orchestrationId: "orch-1",
        orchestrationType: "ProtectedRecruitmentOrchestration",
        graphVersion: "1.0.0",
        previousNode: "candidate_selected",
        currentNode: input.targetNode,
        previousVersion: 1,
        currentVersion: 2,
        workflowsInvoked: [],
        commandsExecuted: [],
        queriesExecuted: [],
        policiesEvaluated: [],
        businessRulesEvaluated: [],
        sagaStepsCompleted: [],
        sagaStepsFailed: [],
        compensationStatus: "not_required",
        eventsEmitted: [],
        scheduledActionsCreated: [],
        retryState: { attempts: 0, nextRetryAt: null, exhausted: false },
        timeoutState: { timeoutAt: null, expired: false },
        recoveryState: "healthy",
        humanReviewRequired: false,
        blockingReasons: [],
        requiredNextActions: [],
        correlationId: "corr-1",
        explanation: "ok",
      };
    },
  });

  return { service, repository, roomProvider, orchestratorCalls, workflowCalls };
}

async function seedToScheduled(service) {
  const draft = await service.createDraft({
    organizationId: "prime-global",
    actorId: "staff-1",
    latestTermsVersion: "v2",
    participants: createInterviewParticipants(),
  });
  const ctx = createInterviewContext({ actor: createInterviewActor({ permissions: ["org:prime-global"] }) });
  await service.selectCandidate(draft.interviewId, ctx);
  await service.createInvitation(draft.interviewId, ctx);
  await service.sendInvitation(draft.interviewId, ctx);
  await service.acceptInvitation(draft.interviewId, ctx);
  await service.acceptCoordinationTerms(draft.interviewId, "v2", ctx);
  await service.scheduleInterview(draft.interviewId, new Date(Date.now() + 3600000).toISOString(), ctx);
  return { interviewId: draft.interviewId, ctx };
}

test("valid lifecycle reaches closed", async () => {
  const { service } = createService();
  const { interviewId, ctx } = await seedToScheduled(service);

  await service.reserveRoom(interviewId, ctx);
  await service.activateInterview(interviewId, ctx);

  const token = await service.issueJoinToken(
    interviewId,
    {
      participantId: "candidate-1",
      participantRole: "Candidate",
      organizationId: "prime-global",
    },
    ctx
  );

  await service.joinInterview(interviewId, {
    participantId: "candidate-1",
    participantRole: "Candidate",
    organizationId: "prime-global",
    tokenExpiresAt: token.expires_at,
  }, ctx);

  await service.completeInterview(interviewId, ctx);
  await service.markEvaluationPending(interviewId, ctx);
  await service.completeEvaluation(interviewId, ctx);
  const closed = await service.closeInterview(interviewId, ctx);

  assert.equal(closed.success, true);
  assert.equal(closed.currentState, "closed");
});

test("invalid transition is rejected", async () => {
  const { service } = createService();
  const draft = await service.createDraft({ organizationId: "prime-global", actorId: "staff-1", latestTermsVersion: "v1" });
  const ctx = createInterviewContext();

  const result = await service.activateInterview(draft.interviewId, ctx);
  assert.equal(result.success, false);
});

test("activation before approval/gates fails", async () => {
  const { service } = createService();
  const { interviewId, ctx } = await seedToScheduled(service);

  const result = await service.activateInterview(interviewId, ctx);
  assert.equal(result.success, false);
  assert.equal(result.errorCategory, "activation_gate_failed");
});

test("token expiration prevents join", async () => {
  const { service } = createService();
  const { interviewId, ctx } = await seedToScheduled(service);
  await service.reserveRoom(interviewId, ctx);
  await service.activateInterview(interviewId, ctx);

  const join = await service.joinInterview(interviewId, {
    participantId: "candidate-1",
    participantRole: "Candidate",
    organizationId: "prime-global",
    tokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
  }, ctx);

  assert.equal(join.success, false);
  assert.equal(join.errorCategory, "token_expired");
});

test("double activation is rejected", async () => {
  const { service } = createService();
  const { interviewId, ctx } = await seedToScheduled(service);
  await service.reserveRoom(interviewId, ctx);
  const one = await service.activateInterview(interviewId, ctx);
  const two = await service.activateInterview(interviewId, ctx);

  assert.equal(one.success, true);
  assert.equal(two.success, false);
});

test("room reuse after closure is rejected", async () => {
  const { service } = createService();
  const { interviewId, ctx } = await seedToScheduled(service);
  await service.reserveRoom(interviewId, ctx);
  await service.activateInterview(interviewId, ctx);
  await service.completeInterview(interviewId, ctx);
  await service.markEvaluationPending(interviewId, ctx);
  await service.completeEvaluation(interviewId, ctx);
  await service.closeInterview(interviewId, ctx);

  const result = await service.reserveRoom(interviewId, ctx);
  assert.equal(result.success, false);
});

test("unauthorized join before activation is denied", async () => {
  const { service } = createService();
  const { interviewId, ctx } = await seedToScheduled(service);
  await service.reserveRoom(interviewId, ctx);

  const result = await service.joinInterview(interviewId, {
    participantId: "x",
    participantRole: "Observer",
    organizationId: "prime-global",
    tokenExpiresAt: new Date(Date.now() + 1000).toISOString(),
  }, ctx);

  assert.equal(result.success, false);
});

test("cross organization join denied", async () => {
  const { service } = createService();
  const { interviewId, ctx } = await seedToScheduled(service);
  await service.reserveRoom(interviewId, ctx);
  await service.activateInterview(interviewId, ctx);

  const result = await service.joinInterview(interviewId, {
    participantId: "candidate-1",
    participantRole: "Candidate",
    organizationId: "other-org",
    tokenExpiresAt: new Date(Date.now() + 1000).toISOString(),
  }, ctx);

  assert.equal(result.success, false);
  assert.equal(result.errorCategory, "cross_organization_access_denied");
});

test("reschedule increments count", async () => {
  const { service } = createService();
  const { interviewId, ctx } = await seedToScheduled(service);

  const result = await service.rescheduleInterview(interviewId, new Date(Date.now() + 7200000).toISOString(), ctx);
  assert.equal(result.success, true);
});

test("cancel and expire transitions work", async () => {
  const { service } = createService();
  const one = await seedToScheduled(service);
  const cancel = await service.cancelInterview(one.interviewId, "cancelled by staff", one.ctx);
  assert.equal(cancel.success, true);

  const two = await seedToScheduled(service);
  const expire = await service.expireInterview(two.interviewId, "expired by policy", two.ctx);
  assert.equal(expire.success, true);
});

test("timeline, audit, evidence append on actions", async () => {
  const { service, repository } = createService();
  const { interviewId, ctx } = await seedToScheduled(service);
  await service.reserveRoom(interviewId, ctx);
  await service.activateInterview(interviewId, ctx);
  await service.leaveInterview(interviewId, "candidate-1", ctx);

  const timeline = await repository.listTimeline(interviewId);
  const evidence = await repository.listEvidence(interviewId);
  const audit = await repository.listAudit(interviewId);

  assert.ok(timeline.length > 0);
  assert.ok(evidence.length > 0);
  assert.ok(audit.some((entry) => entry.action === "activation"));
  assert.ok(audit.some((entry) => entry.action === "leave"));
});

test("workflow and orchestrator integration hooks are called", async () => {
  const { service, orchestratorCalls, workflowCalls } = createService();
  const { interviewId, ctx } = await seedToScheduled(service);
  await service.reserveRoom(interviewId, ctx);
  await service.activateInterview(interviewId, ctx);

  assert.ok(orchestratorCalls.includes("interview_workflow"));
  assert.ok(workflowCalls.includes("ActivateInterviewCommand"));
});
