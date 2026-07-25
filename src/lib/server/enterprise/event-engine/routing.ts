import type { EventRoutingContext, EventRoutingResult, EventSubscriptionRecord } from "./types.ts";

function matchesPriority(subscription: EventSubscriptionRecord, priority: string | null | undefined) {
  if (!priority || subscription.priority_filter.length === 0) return true;
  return subscription.priority_filter.includes(priority as never);
}

function eqOrNull(expected: string | null, actual: string | null | undefined) {
  return expected === null || expected === actual;
}

export function doesSubscriptionMatchEvent(subscription: EventSubscriptionRecord, context: EventRoutingContext): EventRoutingResult {
  if (!subscription.is_active) {
    return { matched: false, reason: "subscription_inactive" };
  }

  const matched =
    eqOrNull(subscription.event_type_id, context.eventTypeId ?? null) &&
    eqOrNull(subscription.category_id, context.categoryId ?? null) &&
    matchesPriority(subscription, context.priority ?? null) &&
    eqOrNull(subscription.organization_id, context.organizationId ?? null) &&
    eqOrNull(subscription.branch_code, context.branchCode ?? null) &&
    eqOrNull(subscription.country_code, context.countryCode ?? null) &&
    eqOrNull(subscription.workflow_ref, context.workflowRef ?? null);

  return {
    matched,
    reason: matched ? "subscription_matched" : "subscription_not_matched",
  };
}
