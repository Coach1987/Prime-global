import test from "node:test";
import assert from "node:assert/strict";
import { createObservabilityAdapterRegistry } from "./adapters.ts";
import { listObservabilityPermissionsForRole } from "./permissions.ts";
import { evaluateSloBurnRate } from "./repository.ts";

test("observability adapter registry resolves configured metrics adapter", async () => {
  const registry = createObservabilityAdapterRegistry({
    metrics: {
      prometheus: {
        providerCode: "prometheus",
        async emit() {
          return { accepted: true, reference: "metric-1" };
        },
      },
    },
  });

  const adapter = registry.resolveMetrics("prometheus");
  const result = await adapter.emit({ metricCode: "ops.latency.p95", metricDomain: "performance", value: 240 });
  assert.equal(result.reference, "metric-1");
});

test("observability permission matrix keeps read-only auditor without mutating powers", () => {
  const auditor = listObservabilityPermissionsForRole("read_only_auditor");
  assert.equal(auditor.includes("ops.audit.read"), true);
  assert.equal(auditor.includes("ops.flags.manage"), false);
});

test("slo burn-rate evaluation escalates when error ratio exceeds target", () => {
  const burn = evaluateSloBurnRate({
    targetAvailability: 99.9,
    observedAvailability: 99.0,
    windowMinutes: 60,
  });

  assert.equal(burn.breached, true);
  assert.equal(burn.burnRate > 1, true);
});
