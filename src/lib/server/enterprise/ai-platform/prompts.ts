import type { AiPromptVersionRecord, AiRenderedPrompt } from "./types.ts";

const TOKEN_PATTERN = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

function resolveValue(path: string, source: Record<string, unknown>): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[part];
  }, source);
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function renderTemplate(template: string, variables: Record<string, unknown>) {
  return template.replace(TOKEN_PATTERN, (_full, path: string) => stringify(resolveValue(path, variables)));
}

export function renderPromptVersion(version: AiPromptVersionRecord, variables: Record<string, unknown>): AiRenderedPrompt {
  return {
    systemPrompt: renderTemplate(version.system_prompt, variables),
    developerPrompt: renderTemplate(version.developer_prompt, variables),
    userPrompt: renderTemplate(version.user_prompt_template, variables),
    locale: version.locale,
  };
}
