import crypto from "node:crypto";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = canonicalize(record[key]);
        return accumulator;
      }, {});
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function computeEvidenceContentHash(input: Record<string, unknown>): string {
  return sha256Hex(stableStringify(input));
}

export function computeEvidenceEventHash(input: Record<string, unknown>): string {
  return sha256Hex(stableStringify(input));
}
