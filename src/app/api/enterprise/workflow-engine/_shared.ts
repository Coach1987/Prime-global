import { requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function requireWorkflowEngineAccess(request: Request) {
  return requireEnterpriseInternalAccess(request);
}
