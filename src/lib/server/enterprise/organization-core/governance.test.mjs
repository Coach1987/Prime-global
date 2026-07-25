import test from "node:test";
import assert from "node:assert/strict";
import { evaluateEnterpriseGovernance } from "./governance.ts";

test("governance evaluation preserves permission decision behavior", () => {
  const result = evaluateEnterpriseGovernance({
    permissionCode: "employees.create",
    rolePermissionCodes: ["employees.create"],
    explicitAllowCodes: [],
    explicitDenyCodes: [],
    actorAuthorityLevel: 10,
    minAuthorityLevel: 70,
    hasMatchingScope: false,
    scopeRequired: true,
    hasActiveDelegation: false,
    amount: 1000,
    currencyCode: "USD",
    actorCurrency: "USD",
    maximumApprovalAmount: 500,
    isUnlimitedMonetaryAuthority: false,
  });

  assert.equal(result.permissionDecision.granted, true);
  assert.equal(result.permissionDecision.source, "role_permission");
  assert.equal(result.authoritySatisfied, false);
  assert.equal(result.scopeSatisfied, false);
  assert.equal(result.monetary.allowed, false);
  assert.equal(result.advisoryReady, false);
});

test("governance evaluation can be advisory-ready when all constraints pass", () => {
  const result = evaluateEnterpriseGovernance({
    permissionCode: "employees.create",
    rolePermissionCodes: ["employees.create"],
    explicitAllowCodes: [],
    explicitDenyCodes: [],
    actorAuthorityLevel: 100,
    minAuthorityLevel: 40,
    hasMatchingScope: true,
    scopeRequired: true,
    hasActiveDelegation: true,
    amount: 1000,
    currencyCode: "USD",
    actorCurrency: "USD",
    maximumApprovalAmount: 2000,
    isUnlimitedMonetaryAuthority: false,
  });

  assert.equal(result.permissionDecision.granted, true);
  assert.equal(result.authoritySatisfied, true);
  assert.equal(result.scopeSatisfied, true);
  assert.equal(result.monetary.allowed, true);
  assert.equal(result.delegationActive, true);
  assert.equal(result.advisoryReady, true);
});
