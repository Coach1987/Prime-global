import test from "node:test";
import assert from "node:assert/strict";
import { createIdentitySecurityAdapterRegistry } from "./adapters.ts";
import { listIdentitySecurityPermissionsForRole } from "./permissions.ts";
import { evaluateSessionRisk } from "./repository.ts";

test("identity security adapter registry resolves configured sms adapter", async () => {
  const registry = createIdentitySecurityAdapterRegistry({
    sms: {
      twilio: {
        providerCode: "twilio",
        async sendOtp() {
          return { status: "queued", providerReference: "sms-1" };
        },
      },
    },
  });

  const adapter = registry.resolveSms("twilio");
  const result = await adapter.sendOtp({ destination: "+15555550100", otpCode: "123456", ttlSeconds: 300 });
  assert.equal(result.providerReference, "sms-1");
});

test("identity security permission matrix includes auditor read-only capabilities", () => {
  const permissions = listIdentitySecurityPermissionsForRole("read_only_auditor");
  assert.equal(permissions.includes("identity.monitoring.read"), true);
  assert.equal(permissions.includes("identity.secrets.manage"), false);
});

test("session risk scoring escalates impossible travel and brute-force indicators", () => {
  const risk = evaluateSessionRisk({ impossibleTravelDetected: true, bruteForceSignalDetected: true, geoVelocityScore: 7 });
  assert.equal(risk.riskLevel, "high");
  assert.equal(risk.riskScore >= 70, true);
});
