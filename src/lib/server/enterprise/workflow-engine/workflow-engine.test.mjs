import test from "node:test";
import assert from "node:assert/strict";
import { evaluateWorkflowRule } from "./rules.ts";
import { evaluateWorkflowTransition, createWorkflowStateMachineDefinition } from "./state-machine.ts";
import { createWorkflowAuditEntry, createWorkflowEventEnvelope, createWorkflowHistoryEntry } from "./audit.ts";
import { isWorkflowEscalationDue, resolveWorkflowEscalationTarget } from "./escalation.ts";

test("workflow transition evaluation allows configured transition", () => {
  const definition = createWorkflowStateMachineDefinition("financial", "draft", [
    { from: "draft", to: "pending", reversible: false, terminal: false },
    { from: "pending", to: "approved", reversible: false, terminal: true },
  ], ["approved"]);

  const result = evaluateWorkflowTransition(definition, {
    workflowTypeCode: "financial",
    currentState: "draft",
    targetState: "pending",
    currentVersion: 0,
    expectedVersion: 0,
    ruleContext: { facts: { amount: 1000 }, amount: 1000, workflowTypeCode: "financial" },
  });

  assert.equal(result.success, true);
  assert.equal(result.currentState, "pending");
});

test("workflow transition evaluation blocks invalid transition", () => {
  const definition = createWorkflowStateMachineDefinition("financial", "draft", [
    { from: "draft", to: "pending", reversible: false, terminal: false },
  ]);

  const result = evaluateWorkflowTransition(definition, {
    workflowTypeCode: "financial",
    currentState: "draft",
    targetState: "approved",
    currentVersion: 1,
    expectedVersion: 1,
    ruleContext: { facts: {}, workflowTypeCode: "financial" },
  });

  assert.equal(result.success, false);
  assert.match(result.explanation, /not configured/);
});

test("workflow rule evaluation supports compound conditions", () => {
  const result = evaluateWorkflowRule(
    {
      match: "all",
      conditions: [
        { field: "amount", operator: "greater_than", value: 500 },
        { field: "country", operator: "equals", value: "Saudi Arabia" },
      ],
    },
    { facts: { amount: 1200, country: "Saudi Arabia" }, amount: 1200, country: "Saudi Arabia" }
  );

  assert.equal(result.matched, true);
});

test("workflow escalation foundation computes due timing and targets", () => {
  const due = isWorkflowEscalationDue("2026-07-18T00:00:00Z", "2026-07-18T01:30:00Z", {
    escalationKind: "timeout",
    timeoutMinutes: 60,
  });

  assert.equal(due.due, true);
  assert.ok(due.nextDueAt);

  const target = resolveWorkflowEscalationTarget("manager", null);
  assert.equal(target.targetType, "manager");
});

test("workflow audit foundation is append-only and immutable", () => {
  const event = createWorkflowEventEnvelope({
    workflowInstanceId: "11111111-1111-1111-1111-111111111111",
    eventType: "workflow_created",
    occurredAt: "2026-07-18T00:00:00Z",
    payload: { source: "test" },
    immutable: false,
  });

  const audit = createWorkflowAuditEntry({
    workflowInstanceId: "11111111-1111-1111-1111-111111111111",
    actionCode: "workflow_created",
    actorType: "system",
    actorKey: "engine",
    outcome: "success",
    reason: "initial creation",
    recordState: { state: "draft" },
    timestamp: "2026-07-18T00:00:00Z",
  });

  const history = createWorkflowHistoryEntry({
    workflowInstanceId: "11111111-1111-1111-1111-111111111111",
    entryType: "state_transition",
    fromStateName: "draft",
    toStateName: "pending",
    description: "Moved to pending review",
    metadata: { actor: "engine" },
    timestamp: "2026-07-18T00:01:00Z",
  });

  assert.equal(event.immutable, true);
  assert.equal(audit.outcome, "success");
  assert.equal(history.toStateName, "pending");
});
