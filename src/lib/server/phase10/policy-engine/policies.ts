import type { Phase10PolicyDefinition } from "./types.ts";

function disabledPolicy(name: string, action: string, conditionDescription: string): Phase10PolicyDefinition {
  return {
    name,
    version: "1.0.0",
    scope: "global",
    subjectRole: "*",
    action,
    condition: () => ({
      passed: false,
      explanation: conditionDescription,
      sourceCategories: ["policy-config"],
      confidence: 0,
      humanReviewRequired: true,
    }),
    severity: "high",
    enforcementAction: "block",
    escalationRule: "Prime Global staff review required",
    enabled: false,
    effectiveAt: new Date().toISOString(),
    auditMetadata: { stage: "foundation" },
  };
}

export const phase10PolicyRegistry: Phase10PolicyDefinition[] = [
  disabledPolicy("candidate selection required before interview invitation", "request_interview_invitation", "Candidate selection must be recorded before an interview invitation can be issued."),
  disabledPolicy("candidate acceptance required before interview activation", "activate_interview", "The selected candidate must accept the invitation before interview activation."),
  disabledPolicy("coordination terms required before joining", "join_interview_room", "Coordination terms must be accepted before a participant can join the room."),
  disabledPolicy("no direct contact exchange", "send_message", "Direct contact exchange is prohibited while Prime Global coordinates the process."),
  disabledPolicy("no external meeting links", "share_external_meeting_link", "External meeting links are blocked until authorized by Prime Global staff."),
  disabledPolicy("original cv never exposed to employers", "view_original_cv", "Employers must never receive the original CV file."),
  disabledPolicy("payment verification required before contract unlock", "unlock_contract", "Fee confirmation and verified payment are required before contract unlock."),
  disabledPolicy("no active critical violation before contract unlock", "unlock_contract", "Active critical violations must be resolved before the contract can be unlocked."),
  disabledPolicy("human approval required for permanent closure or contractual penalties", "permanent_close_process", "Prime Global staff approval is required for permanent closure and contractual penalties."),
];
