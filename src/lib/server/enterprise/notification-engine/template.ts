import type { NotificationRenderResult } from "./types.ts";

const TOKEN_PATTERN = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function renderTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(TOKEN_PATTERN, (_full, key: string) => {
    const value = key.split(".").reduce<unknown>((acc, part) => {
      if (!acc || typeof acc !== "object") return undefined;
      return (acc as Record<string, unknown>)[part];
    }, context);

    return toStringValue(value);
  });
}

export function renderNotificationTemplate(input: {
  titleTemplate: string;
  bodyTemplate: string;
  locale: string;
  context: Record<string, unknown>;
}): NotificationRenderResult {
  return {
    title: renderTemplate(input.titleTemplate, input.context),
    body: renderTemplate(input.bodyTemplate, input.context),
    locale: input.locale,
  };
}
