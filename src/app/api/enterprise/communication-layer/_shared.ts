import { requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function requireCommunicationLayerAccess(request: Request) {
  return requireEnterpriseInternalAccess(request);
}
