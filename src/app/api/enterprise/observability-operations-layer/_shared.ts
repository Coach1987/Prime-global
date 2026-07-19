import { requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function requireObservabilityOperationsAccess(request: Request) {
  return requireEnterpriseInternalAccess(request);
}
