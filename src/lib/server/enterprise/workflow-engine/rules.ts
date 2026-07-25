import type { WorkflowRuleCondition, WorkflowRuleEvaluationContext, WorkflowRuleEvaluationResult, WorkflowRuleExpression, WorkflowRuleExpressionGroup } from "./types.ts";

function resolveFactValue(context: WorkflowRuleEvaluationContext, field: string, path?: string) {
  const source = context.facts[field];

  if (!path || source === null || source === undefined || typeof source !== "object") {
    return source;
  }

  return path.split(".").reduce<unknown>((value, segment) => {
    if (value === null || value === undefined || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[segment];
  }, source);
}

function compareValues(actual: unknown, operator: WorkflowRuleCondition["operator"], expected: unknown) {
  switch (operator) {
    case "equals":
      return actual === expected;
    case "not_equals":
      return actual !== expected;
    case "greater_than":
      return Number(actual) > Number(expected);
    case "greater_or_equal":
      return Number(actual) >= Number(expected);
    case "less_than":
      return Number(actual) < Number(expected);
    case "less_or_equal":
      return Number(actual) <= Number(expected);
    case "contains":
      return typeof actual === "string" && typeof expected === "string" ? actual.includes(expected) : Array.isArray(actual) ? actual.includes(expected) : false;
    case "in":
      return Array.isArray(expected) ? expected.includes(actual) : false;
    case "starts_with":
      return typeof actual === "string" && typeof expected === "string" ? actual.startsWith(expected) : false;
    case "ends_with":
      return typeof actual === "string" && typeof expected === "string" ? actual.endsWith(expected) : false;
    default:
      return false;
  }
}

export function evaluateWorkflowRuleExpression(
  expression: WorkflowRuleExpression,
  context: WorkflowRuleEvaluationContext
): WorkflowRuleEvaluationResult {
  if ("match" in expression) {
    return evaluateWorkflowRuleExpressionGroup(expression, context);
  }

  const actual = resolveFactValue(context, expression.field, expression.path);
  const matched = compareValues(actual, expression.operator, expression.value);

  return {
    matched,
    reason: matched ? `${expression.field} satisfied ${expression.operator}` : `${expression.field} failed ${expression.operator}`,
    failedConditions: matched ? [] : [expression.field],
  };
}

export function evaluateWorkflowRuleExpressionGroup(
  expression: WorkflowRuleExpressionGroup,
  context: WorkflowRuleEvaluationContext
): WorkflowRuleEvaluationResult {
  const childResults = expression.conditions.map((condition) => evaluateWorkflowRuleExpression(condition, context));
  const matched = expression.match === "all" ? childResults.every((result) => result.matched) : childResults.some((result) => result.matched);

  return {
    matched,
    reason: matched ? `Rule group satisfied with ${expression.match} mode` : `Rule group failed with ${expression.match} mode`,
    failedConditions: childResults.flatMap((result) => result.failedConditions),
  };
}

export function evaluateWorkflowRule(
  expression: WorkflowRuleExpression,
  context: WorkflowRuleEvaluationContext
): WorkflowRuleEvaluationResult {
  return evaluateWorkflowRuleExpression(expression, context);
}
