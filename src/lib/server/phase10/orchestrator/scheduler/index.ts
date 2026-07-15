import { createHash } from "node:crypto";

export type ScheduledActionStatus = "scheduled" | "claimed" | "completed" | "failed" | "cancelled";

export interface SchedulerScope {
  organizationId: string;
  tenantId: string | null;
}

export interface ScheduledAction {
  actionId: string;
  orchestrationId: string;
  nodeId: string;
  correlationId: string;
  idempotencyKey: string;
  scope: SchedulerScope;
  scheduledAt: string;
  timeoutAt: string | null;
  payloadHash: string;
  privacySafeMetadata: Record<string, unknown>;
  status: ScheduledActionStatus;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  lastError: string | null;
}

export interface SchedulerProvider {
  scheduleOnce(input: Omit<ScheduledAction, "status" | "leaseOwner" | "leaseExpiresAt" | "lastError">): Promise<ScheduledAction>;
  reschedule(actionId: string, scheduledAt: string): Promise<ScheduledAction | null>;
  cancel(actionId: string): Promise<boolean>;
  listDueActions(now: Date): Promise<ScheduledAction[]>;
  claimAction(actionId: string, owner: string, leaseMs: number): Promise<ScheduledAction | null>;
  completeAction(actionId: string): Promise<ScheduledAction | null>;
  failAction(actionId: string, error: string): Promise<ScheduledAction | null>;
  retryAction(actionId: string, nextScheduledAt: string): Promise<ScheduledAction | null>;
}

export function hashScheduledPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function createInMemorySchedulerProvider(): SchedulerProvider {
  const actions = new Map<string, ScheduledAction>();

  return {
    async scheduleOnce(input) {
      const existing = actions.get(input.actionId);
      if (existing) return existing;

      const action: ScheduledAction = {
        ...input,
        status: "scheduled",
        leaseOwner: null,
        leaseExpiresAt: null,
        lastError: null,
      };
      actions.set(action.actionId, action);
      return action;
    },

    async reschedule(actionId, scheduledAt) {
      const current = actions.get(actionId);
      if (!current) return null;
      current.scheduledAt = scheduledAt;
      current.status = "scheduled";
      return current;
    },

    async cancel(actionId) {
      const current = actions.get(actionId);
      if (!current) return false;
      current.status = "cancelled";
      return true;
    },

    async listDueActions(now) {
      return Array.from(actions.values()).filter(
        (action) => action.status === "scheduled" && new Date(action.scheduledAt).getTime() <= now.getTime()
      );
    },

    async claimAction(actionId, owner, leaseMs) {
      const current = actions.get(actionId);
      if (!current || current.status !== "scheduled") return null;
      current.status = "claimed";
      current.leaseOwner = owner;
      current.leaseExpiresAt = new Date(Date.now() + leaseMs).toISOString();
      return current;
    },

    async completeAction(actionId) {
      const current = actions.get(actionId);
      if (!current) return null;
      current.status = "completed";
      current.leaseOwner = null;
      current.leaseExpiresAt = null;
      return current;
    },

    async failAction(actionId, error) {
      const current = actions.get(actionId);
      if (!current) return null;
      current.status = "failed";
      current.lastError = error;
      current.leaseOwner = null;
      current.leaseExpiresAt = null;
      return current;
    },

    async retryAction(actionId, nextScheduledAt) {
      const current = actions.get(actionId);
      if (!current) return null;
      current.status = "scheduled";
      current.scheduledAt = nextScheduledAt;
      current.leaseOwner = null;
      current.leaseExpiresAt = null;
      return current;
    },
  };
}
