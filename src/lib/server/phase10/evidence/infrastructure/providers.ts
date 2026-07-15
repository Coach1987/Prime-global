import crypto from "node:crypto";
import type {
  Phase10ClockProvider,
  Phase10CryptoProvider,
  Phase10EvidenceStorageProvider,
  Phase10EvidenceStorageReadOutput,
  Phase10EvidenceStorageWriteInput,
  Phase10HashProvider,
  Phase10IdProvider,
  Phase10SignaturePayload,
} from "./types.ts";

export function createSha256HashProvider(): Phase10HashProvider {
  return {
    algorithm: "sha256",
    hash(value: string) {
      return crypto.createHash("sha256").update(value).digest("hex");
    },
  };
}

export function createSystemClockProvider(): Phase10ClockProvider {
  return {
    now() {
      return new Date();
    },
  };
}

export function createUuidIdProvider(): Phase10IdProvider {
  return {
    nextId(prefix?: string) {
      const base = crypto.randomUUID();
      return prefix ? `${prefix}_${base}` : base;
    },
  };
}

function asStorageRecord(input: Phase10EvidenceStorageWriteInput): Phase10EvidenceStorageReadOutput {
  const timestamp = new Date().toISOString();
  return {
    objectKey: input.objectKey,
    payload: input.payload,
    contentType: input.contentType,
    metadata: input.metadata ?? {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createInMemoryEvidenceStorageProvider(
  seed: Map<string, Phase10EvidenceStorageReadOutput> = new Map()
): Phase10EvidenceStorageProvider {
  return {
    async put(input) {
      const previous = seed.get(input.objectKey);
      const next = previous
        ? {
            ...previous,
            payload: input.payload,
            contentType: input.contentType,
            metadata: input.metadata ?? {},
            updatedAt: new Date().toISOString(),
          }
        : asStorageRecord(input);

      seed.set(input.objectKey, next);
      return next;
    },

    async get(objectKey) {
      return seed.get(objectKey) ?? null;
    },

    async remove(objectKey) {
      seed.delete(objectKey);
    },
  };
}

export function createHmacCryptoProvider(secret: string, algorithm = "sha256"): Phase10CryptoProvider {
  function signDigest(input: { digest: string; keyId: string }): Phase10SignaturePayload {
    const signature = crypto.createHmac(algorithm, secret).update(input.digest).digest("hex");
    return {
      digest: input.digest,
      keyId: input.keyId,
      algorithm: `hmac-${algorithm}`,
      signature,
    };
  }

  return {
    async signDigest(input) {
      return signDigest(input);
    },

    async verifyDigest(input) {
      const expected = signDigest({ digest: input.digest, keyId: input.keyId });
      const expectedBuffer = Buffer.from(expected.signature, "utf8");
      const signatureBuffer = Buffer.from(input.signature, "utf8");
      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    },
  };
}
