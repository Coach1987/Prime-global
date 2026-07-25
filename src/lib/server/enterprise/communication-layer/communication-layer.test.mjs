import test from "node:test";
import assert from "node:assert/strict";
import { createCommunicationProviderRegistry } from "./adapters.ts";
import { listCommunicationPermissionsForRole } from "./permissions.ts";

test("communication provider registry resolves configured adapter", async () => {
  const registry = createCommunicationProviderRegistry({
    smtp_generic: {
      providerCode: "smtp_generic",
      channelType: "email",
      async send() {
        return { providerMessageId: "msg-1", status: "queued" };
      },
    },
  });

  const adapter = registry.resolve("smtp_generic");
  const result = await adapter.send({
    recipient: "user@primeglobal.com",
    subject: "Subject",
    body: "Body",
    priority: "normal",
  });

  assert.equal(result.providerMessageId, "msg-1");
});

test("permission matrix includes communication audit for read-only auditor", () => {
  const permissions = listCommunicationPermissionsForRole("read_only_auditor");
  assert.equal(permissions.includes("communication.audit.read"), true);
  assert.equal(permissions.includes("communication.providers.manage"), false);
});
