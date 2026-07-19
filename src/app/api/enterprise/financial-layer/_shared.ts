import { requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function requireFinancialLayerAccess(request: Request) {
  return requireEnterpriseInternalAccess(request);
}
