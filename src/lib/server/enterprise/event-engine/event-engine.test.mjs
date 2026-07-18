import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionEventStatus } from "./lifecycle.ts";
import { checkEventDuplicate, createPublishResult, createReplayResult, createRetryResult, createSubscribeResult, createUnsubscribeResult } from "./bus.ts";
import { doesSubscriptionMatchEvent } from "./routing.ts";

test("event lifecycle allows created -> queued and blocks delivered -> created", () => {
  const allowed = canTransitionEventStatus("created", "queued");
  assert.equal(allowed.allowed, true);

  const blocked = canTransitionEventStatus("delivered", "created");
  assert.equal(blocked.allowed, false);
});

test("duplicate detection uses idempotency key", () => {
  const duplicate = checkEventDuplicate({
    existingEventIdempotencyKey: "evt:100",
    incomingIdempotencyKey: "evt:100",
  });
  assert.equal(duplicate.duplicate, true);

  const unique = checkEventDuplicate({
    existingEventIdempotencyKey: "evt:100",
    incomingIdempotencyKey: "evt:200",
  });
  assert.equal(unique.duplicate, false);
});

test("publish/subscribe/retry/replay result contracts are stable", () => {
  const publish = createPublishResult({ eventId: "ev_1", deduplicated: false, status: "queued" });
  const subscribe = createSubscribeResult("sub_1");
  const unsubscribe = createUnsubscribeResult("sub_1", "manual");
  const retry = createRetryResult({ eventId: "ev_1", retryCount: 2, nextRetryAt: "2026-07-18T10:00:00Z" });
  const replay = createReplayResult({ sourceEventId: "ev_1", replayedEventId: "ev_2" });

  assert.equal(publish.accepted, true);
  assert.equal(subscribe.active, true);
  assert.equal(unsubscribe.active, false);
  assert.equal(retry.status, "retried");
  assert.equal(replay.status, "queued");
});

test("routing matches event by category, priority, and geography context", () => {
  const subscription = {
    id: "sub_1",
    subscriber_id: "subscriber_1",
    event_type_id: null,
    category_id: "cat_1",
    channel_id: null,
    priority_filter: ["high", "critical"],
    organization_id: "org_1",
    branch_code: "riyadh",
    country_code: "sa",
    workflow_ref: null,
    routing_rules: {},
    is_active: true,
    unsubscribed_at: null,
    unsubscribe_reason: null,
    created_at: "2026-07-18T00:00:00Z",
    updated_at: "2026-07-18T00:00:00Z",
  };

  const matched = doesSubscriptionMatchEvent(subscription, {
    categoryId: "cat_1",
    priority: "critical",
    organizationId: "org_1",
    branchCode: "riyadh",
    countryCode: "sa",
  });

  assert.equal(matched.matched, true);

  const notMatched = doesSubscriptionMatchEvent(subscription, {
    categoryId: "cat_1",
    priority: "low",
    organizationId: "org_1",
    branchCode: "riyadh",
    countryCode: "sa",
  });

  assert.equal(notMatched.matched, false);
});
