import { requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function requireNotificationEngineAccess(request: Request) {
  return requireEnterpriseInternalAccess(request);
}
