import type { EnterpriseEmployeeHierarchy, EnterpriseEmployeeNode } from "./types";

export function buildEmployeeHierarchy(
  employees: EnterpriseEmployeeNode[],
  employeeId: string
): EnterpriseEmployeeHierarchy {
  const byId = new Map<string, EnterpriseEmployeeNode>();
  const reportsByManager = new Map<string, string[]>();

  for (const employee of employees) {
    byId.set(employee.id, employee);
    if (employee.managerEmployeeId) {
      const reports = reportsByManager.get(employee.managerEmployeeId) ?? [];
      reports.push(employee.id);
      reportsByManager.set(employee.managerEmployeeId, reports);
    }
  }

  const directReports = reportsByManager.get(employeeId) ?? [];
  const allReports: string[] = [];
  const queue = [...directReports];

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) continue;
    allReports.push(next);
    const nested = reportsByManager.get(next) ?? [];
    for (const nestedId of nested) {
      queue.push(nestedId);
    }
  }

  const managerChain: string[] = [];
  const seen = new Set<string>();
  let cursor = byId.get(employeeId)?.managerEmployeeId ?? null;

  while (cursor && !seen.has(cursor)) {
    managerChain.push(cursor);
    seen.add(cursor);
    cursor = byId.get(cursor)?.managerEmployeeId ?? null;
  }

  return {
    employeeId,
    managerChain,
    directReports,
    allReports,
  };
}
