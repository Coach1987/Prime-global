import { NextResponse } from "next/server";
import { employerProfileCreateSchema, employerProfileUpdateSchema } from "@/features/employers/schemas/portal";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { evaluateAgencyPolicy } from "@/lib/server/employer-policy";
import { buildEmployerProfileCreateRow } from "@/lib/server/employer-portal";
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

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_LOAD_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ success: true, data: null, meta: { requiresOnboarding: auth.role === "employer" } });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-profile-post", 20);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, employerProfileCreateSchema);
  if (parsed.error) return parsed.error;

  const payload = parsed.data;
  const { ipAddress, userAgent } = getRequestContext(request);

  const agencyViolation = evaluateAgencyPolicy({
    companyName: payload.companyName,
    industry: payload.industry,
    companyDescription: payload.companyDescription,
  });

  if (agencyViolation) {
    return NextResponse.json(
      {
        success: false,
        error: { code: agencyViolation.code, message: agencyViolation.message },
        details: {
          messageAr: agencyViolation.messageAr,
          fieldErrors: agencyViolation.fieldErrors,
          localizedFieldErrors: agencyViolation.localizedFieldErrors,
        },
      },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: existingEmployer, error: existingEmployerError } = await supabase
    .from("employers")
    .select("id")
    .eq("auth_user_id", auth.userId)
    .maybeSingle();

  if (existingEmployerError) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_LOOKUP_FAILED", message: existingEmployerError.message } },
      { status: 500 }
    );
  }

  if (existingEmployer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_ALREADY_EXISTS", message: "Employer profile already exists" } },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("employers")
    .insert(buildEmployerProfileCreateRow(auth.userId, payload))
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_CREATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  await supabase.auth.admin.updateUserById(auth.userId, {
    app_metadata: {
      app_role: "employer",
      account_status: "pending_review",
      verification_status: "pending",
    },
    user_metadata: {
      account_status: "pending_review",
      verification_status: "pending",
    },
  });

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.profile.create",
    targetType: "employer",
    targetId: data.id,
    metadata: { createdVia: "portal_onboarding" },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-profile-patch", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, employerProfileUpdateSchema);
  if (parsed.error) return parsed.error;

  const payload = parsed.data;
  const { ipAddress, userAgent } = getRequestContext(request);

  const agencyViolation = evaluateAgencyPolicy({
    companyName: payload.companyName,
    industry: payload.industry,
    companyDescription: payload.companyDescription,
  });

  if (agencyViolation) {
    return NextResponse.json(
      {
        success: false,
        error: { code: agencyViolation.code, message: agencyViolation.message },
        details: {
          messageAr: agencyViolation.messageAr,
          fieldErrors: agencyViolation.fieldErrors,
          localizedFieldErrors: agencyViolation.localizedFieldErrors,
        },
      },
      { status: 400 }
    );
  }

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
