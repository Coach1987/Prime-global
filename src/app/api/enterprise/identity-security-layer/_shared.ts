import { requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function requireIdentitySecurityLayerAccess(request: Request) {
  return requireEnterpriseInternalAccess(request);
}
