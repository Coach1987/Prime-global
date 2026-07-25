import test from "node:test";
import assert from "node:assert/strict";
import { createPaymentProviderRegistry } from "./adapters.ts";
import { evaluateJournalBalance } from "./repository.ts";
import { listFinancialPermissionsForRole } from "./permissions.ts";

test("payment provider registry resolves configured adapter and keeps abstraction", async () => {
  const registry = createPaymentProviderRegistry({
    stripe: {
      providerCode: "stripe",
      async createPaymentIntent() {
        return { externalIntentId: "pi_test", status: "requires_confirmation" };
      },
      async capturePayment() {
        return { externalPaymentId: "pay_test", status: "captured" };
      },
      async refundPayment() {
        return { externalRefundId: "rf_test", status: "succeeded" };
      },
    },
  });

  const adapter = registry.resolve("stripe");
  const intent = await adapter.createPaymentIntent({ amount: 100, currencyCode: "USD", idempotencyKey: "id-1" });
  assert.equal(intent.externalIntentId, "pi_test");
});

test("journal balance check requires double-entry parity", () => {
  const balanced = evaluateJournalBalance([
    { accountId: "a1", entryType: "debit", amount: 500, currencyCode: "USD" },
    { accountId: "a2", entryType: "credit", amount: 500, currencyCode: "USD" },
  ]);

  assert.equal(balanced.balanced, true);
  assert.equal(balanced.debitTotal, 500);
  assert.equal(balanced.creditTotal, 500);

  const unbalanced = evaluateJournalBalance([
    { accountId: "a1", entryType: "debit", amount: 700, currencyCode: "USD" },
    { accountId: "a2", entryType: "credit", amount: 650, currencyCode: "USD" },
  ]);

  assert.equal(unbalanced.balanced, false);
});

test("financial permission matrix includes CFO governance operations", () => {
  const cfo = listFinancialPermissionsForRole("cfo");
  assert.equal(cfo.includes("financial.ledger.post"), true);
  assert.equal(cfo.includes("financial.audit.read"), true);
});
