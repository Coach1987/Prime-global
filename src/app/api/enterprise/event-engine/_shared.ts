import { requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function requireEventEngineAccess(request: Request) {
  return requireEnterpriseInternalAccess(request);
}
