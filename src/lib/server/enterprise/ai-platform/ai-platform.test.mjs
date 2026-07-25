import test from "node:test";
import assert from "node:assert/strict";
import { getProviderAdapter } from "./provider-adapters.ts";
import { renderPromptVersion } from "./prompts.ts";
import { selectAiRoute } from "./routing.ts";
import { evaluateAiSafety } from "./safety.ts";

test("provider adapters are interface-based and simulated", async () => {
  const adapter = getProviderAdapter("openai");
  const result = await adapter.run({
    modelCode: "gpt-sim",
    systemPrompt: "You are a classifier",
    developerPrompt: "Use strict json",
    userPrompt: "Classify input",
    variables: {},
    metadata: {},
  });

  assert.match(result.outputText, /simulated response/);
  assert.equal(result.metadata.simulated, true);
});

test("prompt version rendering injects variables", () => {
  const rendered = renderPromptVersion(
    {
      id: "pv_1",
      prompt_id: "p_1",
      version_label: "v1",
      system_prompt: "System {{context.scope}}",
      developer_prompt: "Dev {{context.policy}}",
      user_prompt_template: "Hello {{user.name}}",
      variables: ["context.scope", "context.policy", "user.name"],
      locale: "en",
      metadata: {},
      is_default: true,
      is_active: true,
      created_at: "2026-07-18T00:00:00Z",
      updated_at: "2026-07-18T00:00:00Z",
    },
    {
      context: { scope: "global", policy: "strict" },
      user: { name: "Prime" },
    }
  );

  assert.match(rendered.systemPrompt, /global/);
  assert.match(rendered.developerPrompt, /strict/);
  assert.match(rendered.userPrompt, /Prime/);
});

test("routing selects preferred eligible provider or fallback to health score", () => {
  const result = selectAiRoute({
    providers: [
      {
        id: "provider_1",
        code: "p1",
        name: "Provider 1",
        provider_kind: "openai",
        region: "global",
        compliance_tags: ["gdpr"],
        health_score: 70,
        supports_streaming: true,
        metadata: {},
        is_active: true,
        created_at: "2026-07-18T00:00:00Z",
        updated_at: "2026-07-18T00:00:00Z",
      },
      {
        id: "provider_2",
        code: "p2",
        name: "Provider 2",
        provider_kind: "anthropic",
        region: "global",
        compliance_tags: ["gdpr", "saudi"],
        health_score: 90,
        supports_streaming: true,
        metadata: {},
        is_active: true,
        created_at: "2026-07-18T00:00:00Z",
        updated_at: "2026-07-18T00:00:00Z",
      },
    ],
    routingRule: {
      id: "rr_1",
      code: "route_1",
      name: "Route 1",
      task_type: "classification",
      preferred_provider_id: "provider_2",
      preferred_model_id: "model_2",
      max_latency_ms: null,
      max_estimated_cost: null,
      required_region: "global",
      required_compliance_tags: ["gdpr"],
      priority: "normal",
      metadata: {},
      is_active: true,
      created_at: "2026-07-18T00:00:00Z",
      updated_at: "2026-07-18T00:00:00Z",
    },
    fallbackRule: null,
  });

  assert.equal(result.selectedProviderId, "provider_2");
});

test("safety policy blocks by authority or high risk", () => {
  const blockedByAuthority = evaluateAiSafety({
    policy: {
      id: "ap_1",
      code: "policy",
      name: "Policy",
      task_type: "moderation",
      min_authority_level: 50,
      requires_human_review: false,
      safety_profile: "strict",
      rate_limit_tier: "default",
      metadata: {},
      is_active: true,
      created_at: "2026-07-18T00:00:00Z",
      updated_at: "2026-07-18T00:00:00Z",
    },
    authorityLevel: 10,
    riskScore: 10,
  });

  assert.equal(blockedByAuthority.status, "blocked");

  const blockedByRisk = evaluateAiSafety({
    policy: null,
    authorityLevel: 100,
    riskScore: 90,
  });

  assert.equal(blockedByRisk.status, "blocked");
});
