import test from "node:test";
import assert from "node:assert/strict";
import { evaluateEnterprisePermission } from "./permissions.ts";

test("permission evaluation priority: explicit deny wins", () => {
  const decision = evaluateEnterprisePermission({
    permissionCode: "organization.write",
    rolePermissionCodes: ["organization.write"],
    explicitAllowCodes: ["organization.write"],
    explicitDenyCodes: ["organization.write"],
  });

  assert.equal(decision.granted, false);
  assert.equal(decision.source, "explicit_deny");
});

test("permission evaluation: explicit allow wins over role/default", () => {
  const decision = evaluateEnterprisePermission({
    permissionCode: "employees.manage",
    rolePermissionCodes: [],
    explicitAllowCodes: ["employees.manage"],
    explicitDenyCodes: [],
  });

  assert.equal(decision.granted, true);
  assert.equal(decision.source, "explicit_allow");
});

test("permission evaluation: role permission when no explicit override", () => {
  const decision = evaluateEnterprisePermission({
    permissionCode: "departments.read",
    rolePermissionCodes: ["departments.read"],
    explicitAllowCodes: [],
    explicitDenyCodes: [],
  });

  assert.equal(decision.granted, true);
  assert.equal(decision.source, "role_permission");
});

test("permission evaluation: default deny", () => {
  const decision = evaluateEnterprisePermission({
    permissionCode: "finance.approve",
    rolePermissionCodes: [],
    explicitAllowCodes: [],
    explicitDenyCodes: [],
  });

  assert.equal(decision.granted, false);
  assert.equal(decision.source, "default_deny");
});

test("permission evaluation: wildcard role permission supports fine-grained hierarchies", () => {
  const decision = evaluateEnterprisePermission({
    permissionCode: "governance.roles.assign",
    rolePermissionCodes: ["governance.*"],
    explicitAllowCodes: [],
    explicitDenyCodes: [],
  });

  assert.equal(decision.granted, true);
  assert.equal(decision.source, "role_permission");
});

test("permission evaluation: wildcard deny overrides wildcard allow", () => {
  const decision = evaluateEnterprisePermission({
    permissionCode: "employees.deactivate",
    rolePermissionCodes: ["employees.*"],
    explicitAllowCodes: ["employees.*"],
    explicitDenyCodes: ["employees.deactivate"],
  });

  assert.equal(decision.granted, false);
  assert.equal(decision.source, "explicit_deny");
});
