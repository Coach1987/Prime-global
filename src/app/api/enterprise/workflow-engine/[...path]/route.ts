import { NextResponse } from "next/server";
import {
  createWorkflowActionSchema,
  createWorkflowAuditSchema,
  createWorkflowAttachmentSchema,
  createWorkflowCommentSchema,
  createWorkflowDecisionSchema,
  createWorkflowEscalationSchema,
  createWorkflowEventSchema,
  createWorkflowHistorySchema,
  createWorkflowInstanceSchema,
  createWorkflowParticipantSchema,
  createWorkflowRuleSchema,
  createWorkflowSchema,
  createWorkflowStageSchema,
  createWorkflowStateSchema,
  createWorkflowTransitionSchema,
  createWorkflowTypeSchema,
  evaluateWorkflowInstanceSchema,
} from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import {
  appendWorkflowAudit,
  appendWorkflowEvent,
  appendWorkflowHistory,
  createWorkflowAction,
  createWorkflowAttachment,
  createWorkflowComment,
  createWorkflowDecision,
  createWorkflowDefinition,
  createWorkflowEscalation,
  createWorkflowInstance,
  createWorkflowParticipant,
  createWorkflowRule,
  createWorkflowStage,
  createWorkflowState,
  createWorkflowTransition,
  createWorkflowType,
  evaluateWorkflowInstance,
  listWorkflowActions,
  listWorkflowAttachments,
  listWorkflowAudits,
  listWorkflowComments,
  listWorkflowDecisions,
  listWorkflowDefinitions,
  listWorkflowEscalations,
  listWorkflowEvents,
  listWorkflowHistory,
  listWorkflowInstances,
  listWorkflowParticipants,
  listWorkflowRules,
  listWorkflowStages,
  listWorkflowStates,
  listWorkflowTransitions,
  listWorkflowTypes,
} from "../../../../../lib/server/enterprise/workflow-engine/index";
import { requireWorkflowEngineAccess } from "../_shared.ts";

function asRecord(value: unknown) {
  return (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
}

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

async function ensureAccess(request: Request) {
  const auth = await requireWorkflowEngineAccess(request);
  if (auth instanceof NextResponse) return auth;
  return null;
}

async function handleWorkflowTypes(request: Request, segments: string[]) {
  if (segments.length === 1) {
    if (request.method === "GET") {
      const data = await listWorkflowTypes();
      return NextResponse.json({ success: true, data });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createWorkflowTypeSchema);
      if (parsed.error) return parsed.error;
      const data = await createWorkflowType({
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        isActive: parsed.data.isActive ?? true,
      });
      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  }

  if (segments.length === 3) {
    const workflowTypeId = segments[1];
    const resource = segments[2];

    if (resource === "states") {
      if (request.method === "GET") {
        const data = await listWorkflowStates(workflowTypeId);
        return NextResponse.json({ success: true, data });
      }

      if (request.method === "POST") {
        const parsed = await parseJsonBody(request, createWorkflowStateSchema);
        if (parsed.error) return parsed.error;
        const data = await createWorkflowState({
          workflowTypeId,
          code: parsed.data.code,
          name: parsed.data.name,
          stateName: parsed.data.stateName,
          sortOrder: parsed.data.sortOrder ?? 0,
          isTerminal: parsed.data.isTerminal ?? false,
        });
        return NextResponse.json({ success: true, data }, { status: 201 });
      }
    }

    if (resource === "transitions") {
      if (request.method === "GET") {
        const data = await listWorkflowTransitions(workflowTypeId);
        return NextResponse.json({ success: true, data });
      }

      if (request.method === "POST") {
        const parsed = await parseJsonBody(request, createWorkflowTransitionSchema);
        if (parsed.error) return parsed.error;
        const data = await createWorkflowTransition({
          workflowTypeId,
          fromStateName: parsed.data.fromStateName,
          toStateName: parsed.data.toStateName,
          transitionCode: parsed.data.transitionCode,
          reversible: parsed.data.reversible ?? false,
          terminal: parsed.data.terminal ?? false,
          condition: parsed.data.condition ? (asRecord(parsed.data.condition) as never) : null,
        });
        return NextResponse.json({ success: true, data }, { status: 201 });
      }
    }

    if (resource === "workflows") {
      if (request.method === "GET") {
        const data = (await listWorkflowDefinitions()).filter((workflow) => workflow.workflow_type_id === workflowTypeId);
        return NextResponse.json({ success: true, data });
      }

      if (request.method === "POST") {
        const parsed = await parseJsonBody(request, createWorkflowSchema);
        if (parsed.error) return parsed.error;
        const data = await createWorkflowDefinition({
          workflowTypeId,
          code: parsed.data.code,
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          definition: parsed.data.definition ?? {},
          isActive: parsed.data.isActive ?? true,
        });
        return NextResponse.json({ success: true, data }, { status: 201 });
      }
    }
  }

  return jsonError("WORKFLOW_ENGINE_NOT_FOUND", "Workflow type endpoint not found", 404);
}

async function handleWorkflows(request: Request, segments: string[]) {
  if (segments.length === 1) {
    if (request.method === "GET") {
      const data = await listWorkflowDefinitions();
      return NextResponse.json({ success: true, data });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createWorkflowSchema);
      if (parsed.error) return parsed.error;
      const data = await createWorkflowDefinition({
        workflowTypeId: parsed.data.workflowTypeId,
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        definition: parsed.data.definition ?? {},
        isActive: parsed.data.isActive ?? true,
      });
      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  }

  if (segments.length === 3) {
    const workflowId = segments[1];
    const resource = segments[2];

    if (resource === "stages") {
      if (request.method === "GET") {
        const data = await listWorkflowStages(workflowId);
        return NextResponse.json({ success: true, data });
      }

      if (request.method === "POST") {
        const parsed = await parseJsonBody(request, createWorkflowStageSchema);
        if (parsed.error) return parsed.error;
        const data = await createWorkflowStage({
          workflowId,
          code: parsed.data.code,
          name: parsed.data.name,
          stageOrder: parsed.data.stageOrder ?? 0,
          approvalMode: parsed.data.approvalMode,
          stateName: parsed.data.stateName,
          ruleExpression: parsed.data.ruleExpression ? (asRecord(parsed.data.ruleExpression) as never) : null,
          isRequired: parsed.data.isRequired ?? true,
        });
        return NextResponse.json({ success: true, data }, { status: 201 });
      }
    }

    if (resource === "rules") {
      if (request.method === "GET") {
        const data = (await listWorkflowRules()).filter((rule) => rule.workflow_id === workflowId || rule.workflow_id === null);
        return NextResponse.json({ success: true, data });
      }

      if (request.method === "POST") {
        const parsed = await parseJsonBody(request, createWorkflowRuleSchema);
        if (parsed.error) return parsed.error;
        const data = await createWorkflowRule({
          workflowId,
          code: parsed.data.code,
          name: parsed.data.name,
          priority: parsed.data.priority ?? 100,
          condition: (parsed.data.condition ? asRecord(parsed.data.condition) : {}) as never,
          isActive: parsed.data.isActive ?? true,
        });
        return NextResponse.json({ success: true, data }, { status: 201 });
      }
    }
  }

  if (segments.length === 5 && segments[2] === "stages" && segments[4] === "actions") {
    const workflowStageId = segments[3];

    if (request.method === "GET") {
      const data = await listWorkflowActions(workflowStageId);
      return NextResponse.json({ success: true, data });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createWorkflowActionSchema);
      if (parsed.error) return parsed.error;
      const data = await createWorkflowAction({
        workflowStageId,
        code: parsed.data.code,
        name: parsed.data.name,
        actionCode: parsed.data.actionCode,
        resultStateName: parsed.data.resultStateName ?? null,
        terminal: parsed.data.terminal ?? false,
      });
      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  }

  return jsonError("WORKFLOW_ENGINE_NOT_FOUND", "Workflow endpoint not found", 404);
}

async function handleWorkflowInstances(request: Request, segments: string[]) {
  if (segments.length === 1) {
    if (request.method === "GET") {
      const data = await listWorkflowInstances();
      return NextResponse.json({ success: true, data });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createWorkflowInstanceSchema);
      if (parsed.error) return parsed.error;
      const data = await createWorkflowInstance({
        workflowId: parsed.data.workflowId,
        workflowTypeId: parsed.data.workflowTypeId,
        code: parsed.data.code,
        externalSubjectType: parsed.data.externalSubjectType ?? null,
        externalSubjectId: parsed.data.externalSubjectId ?? null,
        currentState: parsed.data.currentState ?? "draft",
        status: parsed.data.status ?? "draft",
        context: parsed.data.context ?? {},
      });
      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  }

  if (segments.length === 2 && segments[1] === "evaluate" && request.method === "POST") {
    const parsed = await parseJsonBody(request, evaluateWorkflowInstanceSchema);
    if (parsed.error) return parsed.error;
    const data = await evaluateWorkflowInstance({
      workflowTypeCode: parsed.data.workflowTypeCode,
      currentState: parsed.data.currentState,
      targetState: parsed.data.targetState,
      approvalMode: parsed.data.approvalMode ?? null,
      ruleContext: {
        facts: parsed.data.facts ?? {},
        amount: parsed.data.amount ?? null,
        currencyCode: parsed.data.currencyCode ?? null,
        country: parsed.data.country ?? null,
        employeeRole: parsed.data.employeeRole ?? null,
        authorityLevel: parsed.data.authorityLevel ?? null,
        workflowTypeCode: parsed.data.workflowTypeCode,
      },
      transitions: parsed.data.transitions.map((transition) => ({
        from: transition.fromStateName,
        to: transition.toStateName,
        reversible: transition.reversible ?? false,
        terminal: transition.terminal ?? false,
        condition: transition.condition ? (asRecord(transition.condition) as never) : null,
      })),
      terminalStates: parsed.data.terminalStates ?? [],
      currentVersion: parsed.data.currentVersion ?? 0,
      expectedVersion: parsed.data.expectedVersion,
    });
    return NextResponse.json({ success: true, data });
  }

  if (segments.length === 3) {
    const workflowInstanceId = segments[1];
    const resource = segments[2];

    if (resource === "participants") {
      if (request.method === "GET") {
        const data = await listWorkflowParticipants(workflowInstanceId);
        return NextResponse.json({ success: true, data });
      }

      if (request.method === "POST") {
        const parsed = await parseJsonBody(request, createWorkflowParticipantSchema);
        if (parsed.error) return parsed.error;
        const data = await createWorkflowParticipant({
          workflowInstanceId,
          participantType: parsed.data.participantType,
          participantKey: parsed.data.participantKey,
          participationMode: parsed.data.participationMode,
          isRequired: parsed.data.isRequired ?? false,
        });
        return NextResponse.json({ success: true, data }, { status: 201 });
      }
    }

    if (resource === "decisions") {
      if (request.method === "GET") {
        const data = await listWorkflowDecisions(workflowInstanceId);
        return NextResponse.json({ success: true, data });
      }

      if (request.method === "POST") {
        const parsed = await parseJsonBody(request, createWorkflowDecisionSchema);
        if (parsed.error) return parsed.error;
        const data = await createWorkflowDecision({
          workflowInstanceId,
          workflowStageId: parsed.data.workflowStageId,
          workflowActionId: parsed.data.workflowActionId,
          participantId: parsed.data.participantId,
          decisionKind: parsed.data.decisionKind,
          notes: parsed.data.notes ?? null,
          metadata: parsed.data.metadata ?? {},
        });
        return NextResponse.json({ success: true, data }, { status: 201 });
      }
    }
  }

  return jsonError("WORKFLOW_ENGINE_NOT_FOUND", "Workflow instance endpoint not found", 404);
}

async function handleWorkflowRules(request: Request) {
  if (request.method === "GET") {
    const data = await listWorkflowRules();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createWorkflowRuleSchema);
    if (parsed.error) return parsed.error;
    const data = await createWorkflowRule({
      workflowTypeId: parsed.data.workflowTypeId,
      workflowId: parsed.data.workflowId,
      workflowStageId: parsed.data.workflowStageId,
      workflowInstanceId: parsed.data.workflowInstanceId,
      code: parsed.data.code,
      name: parsed.data.name,
      priority: parsed.data.priority ?? 100,
      condition: (parsed.data.condition ? asRecord(parsed.data.condition) : {}) as never,
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("WORKFLOW_ENGINE_NOT_FOUND", "Workflow rule endpoint not found", 404);
}

async function handleWorkflowEscalations(request: Request) {
  if (request.method === "GET") {
    const data = await listWorkflowEscalations();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createWorkflowEscalationSchema);
    if (parsed.error) return parsed.error;
    const data = await createWorkflowEscalation({
      workflowInstanceId: parsed.data.workflowInstanceId,
      workflowStageId: parsed.data.workflowStageId,
      escalationKind: parsed.data.escalationKind,
      timeoutMinutes: parsed.data.timeoutMinutes ?? null,
      reminderMinutes: parsed.data.reminderMinutes ?? null,
      targetType: parsed.data.targetType,
      targetKey: parsed.data.targetKey ?? null,
      status: parsed.data.status ?? "pending",
      notes: parsed.data.notes ?? null,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("WORKFLOW_ENGINE_NOT_FOUND", "Workflow escalation endpoint not found", 404);
}

async function handleWorkflowEvents(request: Request) {
  if (request.method === "GET") {
    const data = await listWorkflowEvents();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createWorkflowEventSchema);
    if (parsed.error) return parsed.error;
    const data = await appendWorkflowEvent({
      workflowInstanceId: parsed.data.workflowInstanceId,
      eventType: parsed.data.eventType,
      payload: parsed.data.payload ?? {},
      occurredAt: parsed.data.occurredAt,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("WORKFLOW_ENGINE_NOT_FOUND", "Workflow event endpoint not found", 404);
}

async function handleWorkflowHistory(request: Request) {
  if (request.method === "GET") {
    const data = await listWorkflowHistory();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createWorkflowHistorySchema);
    if (parsed.error) return parsed.error;
    const data = await appendWorkflowHistory({
      workflowInstanceId: parsed.data.workflowInstanceId,
      entryType: parsed.data.entryType,
      fromStateName: parsed.data.fromStateName,
      toStateName: parsed.data.toStateName,
      description: parsed.data.description,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("WORKFLOW_ENGINE_NOT_FOUND", "Workflow history endpoint not found", 404);
}

async function handleWorkflowAttachments(request: Request) {
  if (request.method === "GET") {
    const data = await listWorkflowAttachments();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createWorkflowAttachmentSchema);
    if (parsed.error) return parsed.error;
    const data = await createWorkflowAttachment({
      workflowInstanceId: parsed.data.workflowInstanceId,
      fileName: parsed.data.fileName,
      storageKey: parsed.data.storageKey,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes ?? null,
      checksum: parsed.data.checksum ?? null,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("WORKFLOW_ENGINE_NOT_FOUND", "Workflow attachment endpoint not found", 404);
}

async function handleWorkflowComments(request: Request) {
  if (request.method === "GET") {
    const data = await listWorkflowComments();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createWorkflowCommentSchema);
    if (parsed.error) return parsed.error;
    const data = await createWorkflowComment({
      workflowInstanceId: parsed.data.workflowInstanceId,
      authorType: parsed.data.authorType,
      authorKey: parsed.data.authorKey,
      body: parsed.data.body,
      isInternal: parsed.data.isInternal ?? false,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("WORKFLOW_ENGINE_NOT_FOUND", "Workflow comment endpoint not found", 404);
}

async function handleWorkflowAudit(request: Request) {
  if (request.method === "GET") {
    const data = await listWorkflowAudits();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createWorkflowAuditSchema);
    if (parsed.error) return parsed.error;
    const data = await appendWorkflowAudit({
      workflowInstanceId: parsed.data.workflowInstanceId,
      actionCode: parsed.data.actionCode,
      actorType: parsed.data.actorType,
      actorKey: parsed.data.actorKey,
      outcome: parsed.data.outcome,
      reason: parsed.data.reason,
      recordState: parsed.data.recordState ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("WORKFLOW_ENGINE_NOT_FOUND", "Workflow audit endpoint not found", 404);
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-workflow-engine-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const access = await ensureAccess(request);
  if (access) return access;

  const { path } = await params;
  const segments = path.filter((segment) => segment.length > 0);
  const resource = segments[0];

  if (resource === "workflow-types") return handleWorkflowTypes(request, segments);
  if (resource === "workflows") return handleWorkflows(request, segments);
  if (resource === "workflow-instances") return handleWorkflowInstances(request, segments);
  if (resource === "workflow-rules") return handleWorkflowRules(request);
  if (resource === "workflow-escalations") return handleWorkflowEscalations(request);
  if (resource === "workflow-events") return handleWorkflowEvents(request);
  if (resource === "workflow-history") return handleWorkflowHistory(request);
  if (resource === "workflow-attachments") return handleWorkflowAttachments(request);
  if (resource === "workflow-comments") return handleWorkflowComments(request);
  if (resource === "workflow-audit") return handleWorkflowAudit(request);

  return jsonError("WORKFLOW_ENGINE_NOT_FOUND", "Workflow endpoint not found", 404);
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-workflow-engine-post", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const access = await ensureAccess(request);
  if (access) return access;

  const { path } = await params;
  const segments = path.filter((segment) => segment.length > 0);
  const resource = segments[0];

  if (resource === "workflow-types") return handleWorkflowTypes(request, segments);
  if (resource === "workflows") return handleWorkflows(request, segments);
  if (resource === "workflow-instances") return handleWorkflowInstances(request, segments);
  if (resource === "workflow-rules") return handleWorkflowRules(request);
  if (resource === "workflow-escalations") return handleWorkflowEscalations(request);
  if (resource === "workflow-events") return handleWorkflowEvents(request);
  if (resource === "workflow-history") return handleWorkflowHistory(request);
  if (resource === "workflow-attachments") return handleWorkflowAttachments(request);
  if (resource === "workflow-comments") return handleWorkflowComments(request);
  if (resource === "workflow-audit") return handleWorkflowAudit(request);

  return jsonError("WORKFLOW_ENGINE_NOT_FOUND", "Workflow endpoint not found", 404);
}
