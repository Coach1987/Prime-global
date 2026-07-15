import { createHash } from "node:crypto";

export type IdempotencyRecordStatus = "in_progress" | "completed" | "failed" | "expired";

export interface IdempotencyScope {
  organizationId: string;
  tenantId: string | null;
  actorId?: string | null;
}

export interface IdempotencyRecord<T = unknown> {
  key: string;
  scope: IdempotencyScope;
  payloadHash: string;
  status: IdempotencyRecordStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  result?: T;
  errorCode?: string;
}

export interface IdempotencyStartInput {
  key: string;
  scope: IdempotencyScope;
  payloadHash: string;
  ttlMs: number;
}

export interface IdempotencyStore {
  start<T = unknown>(input: IdempotencyStartInput): Promise<{ accepted: boolean; record: IdempotencyRecord<T>; reason?: string }>;
  complete<T = unknown>(key: string, scope: IdempotencyScope, result: T): Promise<IdempotencyRecord<T> | null>;
  fail(key: string, scope: IdempotencyScope, errorCode: string): Promise<IdempotencyRecord | null>;
  get<T = unknown>(key: string, scope: IdempotencyScope): Promise<IdempotencyRecord<T> | null>;
  purgeExpired(now?: Date): Promise<number>;
}

function scopeKey(scope: IdempotencyScope): string {
  return `${scope.organizationId}:${scope.tenantId ?? "none"}:${scope.actorId ?? "none"}`;
}

function recordKey(key: string, scope: IdempotencyScope): string {
  return `${scopeKey(scope)}:${key}`;
}

function nowIso(now = new Date()): string {
  return now.toISOString();
}

function expired(record: IdempotencyRecord, now = new Date()): boolean {
  return new Date(record.expiresAt).getTime() <= now.getTime();
}

export function hashIdempotencyPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function createInMemoryIdempotencyStore(): IdempotencyStore {
  const records = new Map<string, IdempotencyRecord>();

  return {
    async start<T = unknown>(input: IdempotencyStartInput) {
      const key = recordKey(input.key, input.scope);
      const current = records.get(key) as IdempotencyRecord<T> | undefined;
      const now = new Date();

      if (current && expired(current, now)) {
        current.status = "expired";
        current.updatedAt = nowIso(now);
      }

      if (current && current.status !== "expired") {
        if (current.payloadHash !== input.payloadHash) {
          return { accepted: false, record: current, reason: "payload_mismatch" };
        }
        return { accepted: false, record: current, reason: current.status };
      }

      const created: IdempotencyRecord<T> = {
        key: input.key,
        scope: input.scope,
        payloadHash: input.payloadHash,
        status: "in_progress",
        createdAt: nowIso(now),
        updatedAt: nowIso(now),
        expiresAt: new Date(now.getTime() + input.ttlMs).toISOString(),
      };

      records.set(key, created);
      return { accepted: true, record: created };
    },

    async complete<T = unknown>(key: string, scope: IdempotencyScope, result: T) {
      const current = records.get(recordKey(key, scope)) as IdempotencyRecord<T> | undefined;
      if (!current) return null;
      current.status = "completed";
      current.updatedAt = nowIso();
      current.result = result;
      return current;
    },

    async fail(key: string, scope: IdempotencyScope, errorCode: string) {
      const current = records.get(recordKey(key, scope));
      if (!current) return null;
      current.status = "failed";
      current.updatedAt = nowIso();
      current.errorCode = errorCode;
      return current;
    },

    async get<T = unknown>(key: string, scope: IdempotencyScope) {
      const current = records.get(recordKey(key, scope)) as IdempotencyRecord<T> | undefined;
      if (!current) return null;
      if (expired(current)) {
        current.status = "expired";
        current.updatedAt = nowIso();
      }
      return current;
    },

    async purgeExpired(now = new Date()) {
      let removed = 0;
      for (const [key, value] of records.entries()) {
        if (expired(value, now)) {
          records.delete(key);
          removed += 1;
        }
      }
      return removed;
    },
  };
}
