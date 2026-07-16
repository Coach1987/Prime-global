import { z } from "zod";
import { createAiError } from "../contracts/errors.ts";
import type { AiError, AiTaskType } from "../contracts/types.ts";
import { StructuredOutputSchemas } from "./output-schemas.ts";

interface ValidationSuccess<T> {
  ok: true;
  data: T;
  repairsUsed: number;
  warnings: string[];
}

interface ValidationFailure {
  ok: false;
  error: AiError;
  repairsUsed: number;
  warnings: string[];
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function stripCodeFences(input: string): string {
  return input.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function extractJsonSlice(input: string): string {
  const firstBrace = input.indexOf("{");
  const lastBrace = input.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return input;
  }
  return input.slice(firstBrace, lastBrace + 1);
}

function removeTrailingCommas(input: string): string {
  return input.replace(/,\s*([}\]])/g, "$1");
}

function normalizeSingleQuotes(input: string): string {
  return input.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, match) => `"${String(match).replace(/\"/g, '"')}"`);
}

function parseJsonDeterministic(input: unknown): {
  parsed?: unknown;
  repairsUsed: number;
  warnings: string[];
  error?: AiError;
} {
  if (typeof input !== "string") {
    return { parsed: input, repairsUsed: 0, warnings: [] };
  }

  const warnings: string[] = [];
  const candidates: string[] = [input];

  const repairOne = extractJsonSlice(stripCodeFences(input));
  if (repairOne !== input) {
    candidates.push(repairOne);
  }

  const repairTwo = normalizeSingleQuotes(removeTrailingCommas(repairOne));
  if (repairTwo !== repairOne) {
    candidates.push(repairTwo);
  }

  const maxAttempts = Math.min(candidates.length, 3);
  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = candidates[i];
    try {
      return {
        parsed: JSON.parse(candidate),
        repairsUsed: Math.max(0, i),
        warnings,
      };
    } catch {
      if (i > 0) {
        warnings.push(`deterministic repair attempt ${i} failed`);
      }
    }
  }

  return {
    repairsUsed: 2,
    warnings,
    error: createAiError({
      code: "AI_INVALID_RESPONSE",
      message: "Unable to parse JSON output after deterministic repairs",
      retriable: false,
    }),
  };
}

function normalizeZodError(error: z.ZodError): AiError {
  const issue = error.issues[0];
  return createAiError({
    code: "AI_SCHEMA_VALIDATION_FAILED",
    message: "Structured output failed schema validation",
    retriable: false,
    safeDetails: issue
      ? {
          path: issue.path.join("."),
          issue: issue.code,
        }
      : undefined,
  });
}

export function validateStructuredOutput<T = Record<string, unknown>>(
  taskType: AiTaskType,
  payload: unknown
): ValidationResult<T> {
  const schema = StructuredOutputSchemas[taskType];
  if (!schema) {
    return {
      ok: false,
      repairsUsed: 0,
      warnings: [],
      error: createAiError({
        code: "AI_SCHEMA_VALIDATION_FAILED",
        message: `No schema configured for task: ${taskType}`,
        retriable: false,
      }),
    };
  }

  const parsed = parseJsonDeterministic(payload);
  if (parsed.error) {
    return {
      ok: false,
      repairsUsed: parsed.repairsUsed,
      warnings: parsed.warnings,
      error: parsed.error,
    };
  }

  const validated = schema.safeParse(parsed.parsed);
  if (!validated.success) {
    return {
      ok: false,
      repairsUsed: parsed.repairsUsed,
      warnings: parsed.warnings,
      error: normalizeZodError(validated.error),
    };
  }

  return {
    ok: true,
    data: validated.data as T,
    repairsUsed: parsed.repairsUsed,
    warnings: parsed.warnings,
  };
}

export type { ValidationResult };