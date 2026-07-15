import type { OrchestrationState } from "../types/index.ts";

export type ManualInterventionAction =
  | "pause"
  | "resume"
  | "retry_failed_node"
  | "skip_reversible_node"
  | "move_to_manual_review"
  | "approve_guarded_transition"
  | "reject_guarded_transition"
  | "activate_compensation"
  | "acknowledge_irreversible_failure";

export interface ManualInterventionInput {
  orchestrationId: string;
  action: ManualInterventionAction;
  staffIdentity: string;
  staffRole: string;
  organizationId: string;
  reasonCode: string;
  justification: string;
  evidenceReferences: string[];
  previousState: string;
  nextState: string;
  timestamp: string;
  appealEligibility: boolean;
  notificationState: "pending" | "sent" | "not_required";
  policyEvaluationResult: "allowed" | "denied";
  followUpAction: string;
  nextReviewAt: string | null;
  idempotencyKey: string;
}

export interface ManualInterventionRecord extends ManualInterventionInput {
  interventionId: string;
}

export interface ManualInterventionService {
  intervene(input: ManualInterventionInput, orchestration: OrchestrationState): Promise<ManualInterventionRecord>;
  list(orchestrationId: string): Promise<ManualInterventionRecord[]>;
}

const STAFF_ROLES = new Set(["prime_global_recruiter", "prime_global_admin", "super_admin"]);

export function createManualInterventionService() : ManualInterventionService {
  const records: ManualInterventionRecord[] = [];

  return {
    async intervene(input, orchestration) {
      if (!STAFF_ROLES.has(input.staffRole)) {
        throw new Error("unauthorized_intervention_role");
      }
      if (input.organizationId !== orchestration.scope.organizationId) {
        throw new Error("cross_organization_intervention_denied");
      }
      if (input.policyEvaluationResult !== "allowed") {
        throw new Error("policy_denied");
      }

      const record: ManualInterventionRecord = {
        ...input,
        interventionId: `${input.orchestrationId}:${records.length + 1}`,
      };
      records.push(record);
      return record;
    },

    async list(orchestrationId) {
      return records.filter((entry) => entry.orchestrationId === orchestrationId);
    },
  };
}
