import { NextResponse } from "next/server";
import { employerRegistrationSchema } from "@/features/employers/schemas/portal";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { createAuditLog } from "@/lib/server/security/audit";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-register", 20);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const parsed = await parseJsonBody(request, employerRegistrationSchema);
  if (parsed.error) return parsed.error;

  const payload = parsed.data;
  const { ipAddress, userAgent } = getRequestContext(request);

  const supabase = createSupabaseAdminClient();

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    app_metadata: { app_role: "employer", account_status: "pending_review" },
    user_metadata: {
      company_name: payload.companyName,
      app_role: "employer",
      account_status: "pending_review",
    },
  });

  if (userError || !userData.user) {
    return NextResponse.json(
      { success: false, error: { code: "AUTH_REGISTER_FAILED", message: userError?.message ?? "Register failed" } },
      { status: 400 }
    );
  }

  const { error: employerError } = await supabase.from("employers").insert({
    auth_user_id: userData.user.id,
    company_name: payload.companyName,
    commercial_registration_number: payload.commercialRegistrationNumber,
    tax_number: payload.taxNumber,
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
    verification_status: "pending",
  });

  if (employerError) {
    await supabase.auth.admin.deleteUser(userData.user.id);
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_CREATE_FAILED", message: employerError.message } },
      { status: 400 }
    );
  }

  await createAuditLog({
    actorAuthUserId: userData.user.id,
    actorRole: "employer",
    action: "employer.register",
    targetType: "employer",
    targetId: userData.user.id,
    metadata: { companyName: payload.companyName },
    ipAddress,
    userAgent,
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        userId: userData.user.id,
        email: userData.user.email,
        accountStatus: "pending_review",
        verificationStatus: "pending",
      },
    },
    { status: 201 }
  );
}
