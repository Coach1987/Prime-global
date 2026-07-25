import type { SkillAliasRecord, SkillNormalizationResult, SkillTaxonomyRecord } from "./types.ts";

export function canonicalizeSkillKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_\-./\\]+/g, "")
    .trim();
}

export function normalizeSkill(input: {
  rawSkill: string;
  taxonomy: SkillTaxonomyRecord[];
  aliases: SkillAliasRecord[];
}): SkillNormalizationResult {
  const normalizedKey = canonicalizeSkillKey(input.rawSkill);

  const alias = input.aliases.find((item) => item.is_active && item.normalized_key === normalizedKey) ?? null;
  if (alias) {
    const taxonomy = input.taxonomy.find((item) => item.id === alias.taxonomy_id && item.is_active) ?? null;
    if (taxonomy) {
      return {
        rawSkill: input.rawSkill,
        normalizedKey,
        matchedTaxonomyId: taxonomy.id,
        normalizedSkillName: taxonomy.canonical_name,
      };
    }
  }

  const direct = input.taxonomy.find((item) => item.is_active && item.normalized_key === normalizedKey) ?? null;
  if (direct) {
    return {
      rawSkill: input.rawSkill,
      normalizedKey,
      matchedTaxonomyId: direct.id,
      normalizedSkillName: direct.canonical_name,
    };
  }

  return {
    rawSkill: input.rawSkill,
    normalizedKey,
    matchedTaxonomyId: null,
    normalizedSkillName: input.rawSkill.trim(),
  };
}
