import { requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function requireAiPlatformAccess(request: Request) {
  return requireEnterpriseInternalAccess(request);
}
