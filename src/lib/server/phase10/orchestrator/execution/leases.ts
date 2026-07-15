export interface OrchestrationLease {
  orchestrationId: string;
  owner: string;
  acquiredAt: string;
  expiresAt: string;
}

export interface OrchestrationLeaseProvider {
  acquire(orchestrationId: string, owner: string, leaseMs: number): Promise<{ acquired: boolean; lease: OrchestrationLease | null; reason?: string }>;
  renew(orchestrationId: string, owner: string, leaseMs: number): Promise<OrchestrationLease | null>;
  release(orchestrationId: string, owner: string): Promise<boolean>;
  get(orchestrationId: string): Promise<OrchestrationLease | null>;
}

function isExpired(lease: OrchestrationLease): boolean {
  return new Date(lease.expiresAt).getTime() <= Date.now();
}

export function createInMemoryOrchestrationLeaseProvider(): OrchestrationLeaseProvider {
  const leases = new Map<string, OrchestrationLease>();

  return {
    async acquire(orchestrationId, owner, leaseMs) {
      const current = leases.get(orchestrationId);
      if (current && !isExpired(current) && current.owner !== owner) {
        return {
          acquired: false,
          lease: current,
          reason: "orchestration_locked",
        };
      }

      const now = new Date();
      const lease: OrchestrationLease = {
        orchestrationId,
        owner,
        acquiredAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + leaseMs).toISOString(),
      };
      leases.set(orchestrationId, lease);
      return { acquired: true, lease };
    },

    async renew(orchestrationId, owner, leaseMs) {
      const current = leases.get(orchestrationId);
      if (!current || current.owner !== owner || isExpired(current)) return null;
      current.expiresAt = new Date(Date.now() + leaseMs).toISOString();
      return current;
    },

    async release(orchestrationId, owner) {
      const current = leases.get(orchestrationId);
      if (!current || current.owner !== owner) return false;
      leases.delete(orchestrationId);
      return true;
    },

    async get(orchestrationId) {
      const current = leases.get(orchestrationId);
      if (!current) return null;
      if (isExpired(current)) {
        leases.delete(orchestrationId);
        return null;
      }
      return current;
    },
  };
}
