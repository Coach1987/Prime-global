import type { AiFallbackRuleRecord, AiProviderRecord, AiRoutingRuleRecord, AiSelectedRoute } from "./types.ts";

function includesAllCompliance(provider: AiProviderRecord, required: string[]) {
  if (required.length === 0) return true;
  return required.every((tag) => provider.compliance_tags.includes(tag));
}

function matchesRegion(provider: AiProviderRecord, requiredRegion: string | null | undefined) {
  if (!requiredRegion) return true;
  return provider.region === requiredRegion || provider.region === "global";
}

export function selectAiRoute(input: {
  providers: AiProviderRecord[];
  routingRule: AiRoutingRuleRecord | null;
  fallbackRule: AiFallbackRuleRecord | null;
  requiredRegion?: string;
  requiredComplianceTags?: string[];
}): AiSelectedRoute {
  const activeProviders = input.providers.filter((provider) => provider.is_active);

  const requiredRegion = input.requiredRegion ?? input.routingRule?.required_region ?? null;
  const requiredComplianceTags = input.requiredComplianceTags ?? input.routingRule?.required_compliance_tags ?? [];

  const eligible = activeProviders
    .filter((provider) => matchesRegion(provider, requiredRegion))
    .filter((provider) => includesAllCompliance(provider, requiredComplianceTags))
    .sort((a, b) => b.health_score - a.health_score);

  if (input.routingRule?.preferred_provider_id) {
    const preferred = eligible.find((provider) => provider.id === input.routingRule?.preferred_provider_id);
    if (preferred) {
      return {
        selectedProviderId: preferred.id,
        selectedModelId: input.routingRule.preferred_model_id,
        reason: "preferred_provider_selected",
        fallbackProviderId: input.fallbackRule?.fallback_provider_id ?? null,
      };
    }
  }

  const best = eligible[0] ?? null;
  return {
    selectedProviderId: best?.id ?? null,
    selectedModelId: input.routingRule?.preferred_model_id ?? null,
    reason: best ? "highest_health_provider_selected" : "no_provider_available",
    fallbackProviderId: input.fallbackRule?.fallback_provider_id ?? null,
  };
}
