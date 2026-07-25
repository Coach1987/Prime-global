import test from "node:test";
import assert from "node:assert/strict";
import { buildEmployeeHierarchy } from "./hierarchy.ts";

const employees = [
  { id: "owner", managerEmployeeId: null },
  { id: "director", managerEmployeeId: "owner" },
  { id: "manager-a", managerEmployeeId: "director" },
  { id: "manager-b", managerEmployeeId: "director" },
  { id: "staff-1", managerEmployeeId: "manager-a" },
  { id: "staff-2", managerEmployeeId: "manager-a" },
  { id: "staff-3", managerEmployeeId: "manager-b" },
];

test("hierarchy traversal returns manager chain and reports", () => {
  const hierarchy = buildEmployeeHierarchy(employees, "manager-a");

  assert.deepEqual(hierarchy.managerChain, ["director", "owner"]);
  assert.deepEqual(hierarchy.directReports, ["staff-1", "staff-2"]);
  assert.deepEqual(hierarchy.allReports, ["staff-1", "staff-2"]);
});

test("hierarchy traversal supports unlimited report depth", () => {
  const hierarchy = buildEmployeeHierarchy(employees, "director");

  assert.deepEqual(hierarchy.directReports, ["manager-a", "manager-b"]);
  assert.deepEqual(hierarchy.allReports, ["manager-a", "manager-b", "staff-1", "staff-2", "staff-3"]);
});
