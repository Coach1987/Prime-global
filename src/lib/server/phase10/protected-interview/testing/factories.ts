import { randomUUID } from "node:crypto";
import type { WorkflowActorContext } from "../../workflow/index.ts";
import type { InterviewContext, InterviewParticipant } from "../types.ts";

export function createInterviewActor(overrides?: Partial<WorkflowActorContext>): WorkflowActorContext {
  return {
    actorId: overrides?.actorId ?? `actor:${randomUUID()}`,
    role: overrides?.role ?? "prime_global_recruiter",
    authenticated: overrides?.authenticated ?? true,
    permissions: overrides?.permissions ?? ["org:prime-global"],
  };
}

export function createInterviewContext(overrides?: Partial<InterviewContext>): InterviewContext {
  return {
    actor: overrides?.actor ?? createInterviewActor(),
    correlationId: overrides?.correlationId ?? `corr:${randomUUID()}`,
    causationId: overrides?.causationId ?? null,
    idempotencyKey: overrides?.idempotencyKey ?? `idem:${randomUUID()}`,
  };
}

export function createInterviewParticipants(): InterviewParticipant[] {
  return [
    { participantId: "candidate-1", role: "Candidate", organizationId: "prime-global" },
    { participantId: "employer-1", role: "Employer", organizationId: "prime-global" },
    { participantId: "staff-1", role: "Prime Recruiter", organizationId: "prime-global" },
  ];
}
