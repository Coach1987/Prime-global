import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionNotificationStatus } from "./lifecycle.ts";
import { isPreferenceMuted, resolvePreferredLocale } from "./preferences.ts";
import { renderNotificationTemplate } from "./template.ts";

test("notification lifecycle allows queued -> processing and blocks deleted -> unread", () => {
  const allowed = canTransitionNotificationStatus("queued", "processing");
  assert.equal(allowed.allowed, true);

  const blocked = canTransitionNotificationStatus("deleted", "unread");
  assert.equal(blocked.allowed, false);
});

test("template rendering resolves tokens from nested event payload", () => {
  const rendered = renderNotificationTemplate({
    titleTemplate: "{{payload.title}}",
    bodyTemplate: "Hello {{recipientKey}}, workflow {{payload.workflowRef}} updated",
    locale: "en",
    context: {
      recipientKey: "user_1",
      payload: { title: "Approval Required", workflowRef: "wf_123" },
    },
  });

  assert.equal(rendered.title, "Approval Required");
  assert.match(rendered.body, /user_1/);
  assert.match(rendered.body, /wf_123/);
});

test("preference helper supports mute windows and locale fallback", () => {
  const muted = isPreferenceMuted({
    id: "pref_1",
    recipient_key: "user_1",
    channel_id: "channel_1",
    rule_code: null,
    locale: "ar",
    mute_until: "2999-01-01T00:00:00.000Z",
    quiet_hours: {},
    enabled: true,
    metadata: {},
    created_at: "2026-07-18T00:00:00Z",
    updated_at: "2026-07-18T00:00:00Z",
  });
  assert.equal(muted, true);

  const locale = resolvePreferredLocale(null, "en");
  assert.equal(locale, "en");
});
