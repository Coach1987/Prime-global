export interface WorkflowLockScope {
  organizationId: string;
  tenantId: string | null;
}

export interface WorkflowLock {
  key: string;
  owner: string;
  scope: WorkflowLockScope;
  acquiredAt: string;
  leaseExpiresAt: string;
}

export interface WorkflowLockAcquireInput {
  key: string;
  owner: string;
  scope: WorkflowLockScope;
  leaseMs: number;
}

export interface WorkflowLockConflict {
  code: "workflow_locked";
  message: string;
  key: string;
  owner: string;
  leaseExpiresAt: string;
}

export interface WorkflowLockProvider {
  acquire(input: WorkflowLockAcquireInput): Promise<{ acquired: true; lock: WorkflowLock } | { acquired: false; conflict: WorkflowLockConflict }>;
  renew(key: string, owner: string, scope: WorkflowLockScope, leaseMs: number): Promise<WorkflowLock | null>;
  release(key: string, owner: string, scope: WorkflowLockScope): Promise<boolean>;
  get(key: string, scope: WorkflowLockScope): Promise<WorkflowLock | null>;
}

function scopeKey(scope: WorkflowLockScope): string {
  return `${scope.organizationId}:${scope.tenantId ?? "none"}`;
}

function lockKey(key: string, scope: WorkflowLockScope): string {
  return `${scopeKey(scope)}:${key}`;
}

function isExpired(lock: WorkflowLock, now = new Date()): boolean {
  return new Date(lock.leaseExpiresAt).getTime() <= now.getTime();
}

export function createInMemoryWorkflowLockProvider(): WorkflowLockProvider {
  const locks = new Map<string, WorkflowLock>();

  return {
    async acquire(input) {
      const key = lockKey(input.key, input.scope);
      const current = locks.get(key);
      const now = new Date();

      if (current && isExpired(current, now)) {
        locks.delete(key);
      }

      const fresh = locks.get(key);
      if (fresh && fresh.owner !== input.owner) {
        return {
          acquired: false,
          conflict: {
            code: "workflow_locked",
            message: `Lock ${input.key} is already held by ${fresh.owner}.`,
            key: input.key,
            owner: fresh.owner,
            leaseExpiresAt: fresh.leaseExpiresAt,
          },
        };
      }

      const lock: WorkflowLock = {
        key: input.key,
        owner: input.owner,
        scope: input.scope,
        acquiredAt: now.toISOString(),
        leaseExpiresAt: new Date(now.getTime() + input.leaseMs).toISOString(),
      };
      locks.set(key, lock);
      return { acquired: true, lock };
    },

    async renew(key, owner, scope, leaseMs) {
      const current = locks.get(lockKey(key, scope));
      if (!current || current.owner !== owner || isExpired(current)) {
        return null;
      }
      current.leaseExpiresAt = new Date(Date.now() + leaseMs).toISOString();
      return current;
    },

    async release(key, owner, scope) {
      const scopedKey = lockKey(key, scope);
      const current = locks.get(scopedKey);
      if (!current || current.owner !== owner) return false;
      locks.delete(scopedKey);
      return true;
    },

    async get(key, scope) {
      const current = locks.get(lockKey(key, scope));
      if (!current) return null;
      if (isExpired(current)) {
        locks.delete(lockKey(key, scope));
        return null;
      }
      return current;
    },
  };
}
