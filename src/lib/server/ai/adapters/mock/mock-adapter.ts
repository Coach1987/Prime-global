import { unsupportedCapabilityError } from "../../contracts/errors.ts";
import type {
  AiCapability,
  AiExecutionContext,
  AiProviderAdapter,
  AiRequest,
  AiResponse,
} from "../../contracts/types.ts";

const SUPPORTED: AiCapability[] = ["generate_text", "generate_json", "embed", "classify", "health_check"];

function baseResponse(request: AiRequest): Omit<AiResponse, "ok" | "capability"> {
  const executionTimestamp = new Date().toISOString();

  return {
    provider: "mock",
    model: "mock-static-v1",
    taskType: request.taskType,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      latencyMs: 1,
      retriesUsed: 0,
      fallbackDepth: 0,
      estimatedCostUsd: 0,
    },
    metadata: {
      provider: "mock",
      model: "mock-static-v1",
      promptRef: request.promptRef,
      executionTimestamp,
      schemaVersion: "v1",
      provenanceRefs: [{ source: "system", reference: "mock-adapter" }],
    },
  };
}

function unsupported(request: AiRequest, capability: string): AiResponse {
  return {
    ...baseResponse(request),
    ok: false,
    capability: request.capability,
    error: unsupportedCapabilityError("mock", capability),
  };
}

export class MockAiProviderAdapter implements AiProviderAdapter {
  readonly provider = "mock" as const;
  readonly capabilities = SUPPORTED;

  async generateText(request: AiRequest): Promise<AiResponse> {
    if (request.capability !== "generate_text") {
      return unsupported(request, "generate_text");
    }

    return {
      ...baseResponse(request),
      ok: true,
      capability: "generate_text",
      text: `mock-text:${request.taskType}`,
    };
  }

  async generateJson<TJson = Record<string, unknown>>(request: AiRequest): Promise<AiResponse<TJson>> {
    if (request.capability !== "generate_json") {
      return unsupported(request, "generate_json") as AiResponse<TJson>;
    }

    const json = {
      taskType: request.taskType,
      promptVersion: request.promptRef.version,
      provider: "mock",
    } as TJson;

    return {
      ...baseResponse(request),
      ok: true,
      capability: "generate_json",
      json,
    };
  }

  async embed(request: AiRequest): Promise<AiResponse> {
    if (request.capability !== "embed") {
      return unsupported(request, "embed");
    }

    return {
      ...baseResponse(request),
      ok: true,
      capability: "embed",
      embedding: [0.01, 0.02, 0.03],
    };
  }

  async classify(request: AiRequest): Promise<AiResponse> {
    if (request.capability !== "classify") {
      return unsupported(request, "classify");
    }

    return {
      ...baseResponse(request),
      ok: true,
      capability: "classify",
      classification: {
        label: "mock",
        score: 0.99,
        labels: [{ label: "mock", score: 0.99 }],
      },
    };
  }

  async healthCheck(context: AiExecutionContext) {
    return {
      ok: true,
      provider: "mock" as const,
      latencyMs: 1,
      details: {
        environment: context.environment,
      },
    };
  }
}