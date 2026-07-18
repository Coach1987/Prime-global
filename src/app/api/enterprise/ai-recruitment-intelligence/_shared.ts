import { requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function requireAiRecruitmentIntelligenceAccess(request: Request) {
  return requireEnterpriseInternalAccess(request);
}
