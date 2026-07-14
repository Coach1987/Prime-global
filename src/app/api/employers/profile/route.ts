import { NextResponse } from "next/server";
import { employerProfileUpdateSchema } from "@/features/employers/schemas/portal";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-profile-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();
  const query = supabase.from("employers").select("*");
  if (auth.role === "employer") {
    query.eq("auth_user_id", auth.userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: error?.message ?? "Not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function PATCH(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-profile-patch", 60);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, employerProfileUpdateSchema);
  if (parsed.error) return parsed.error;

  const payload = parsed.data;
  const { ipAddress, userAgent } = getRequestContext(request);

  const supabase = createSupabaseAdminClient();

  const { data: employer, error: employerError } = await supabase
    .from("employers")
    .select("id, auth_user_id")
    .eq("auth_user_id", auth.userId)
    .maybeSingle();

  if (employerError || !employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: employerError?.message ?? "Not found" } },
      { status: 404 }
    );
  }

  const dbPayload = {
    company_name: payload.companyName,
    country: payload.country,
    city: payload.city,
    address: payload.address,
    website: payload.website || null,
    company_email: payload.companyEmail,
    hr_contact: payload.hrContact,
    phone_number: payload.phoneNumber,
    industry: payload.industry,
    company_size: payload.companySize,
    company_description: payload.companyDescription,
    logo_storage_path: payload.logoStoragePath,
  };

  const { data, error } = await supabase
    .from("employers")
    .update(dbPayload)
    .eq("id", employer.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_UPDATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.profile.update",
    targetType: "employer",
    targetId: employer.id,
    metadata: { changedFields: Object.keys(payload) },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ success: true, data });
}
