import { NextResponse } from "next/server";
import { employerRegistrationSchema } from "@/features/employers/schemas/portal";
import { createSupabaseAdminClient, createSupabasePublicClient } from "@/lib/server/supabase";
import { createAuditLog } from "@/lib/server/security/audit";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { evaluateAgencyPolicy } from "@/lib/server/employer-policy";
import { LEGAL_DOCUMENT_VERSION, persistLegalAcceptances } from "@/lib/server/security/legal-acceptance";
import { setAuthCookies } from "@/lib/server/security/session-cookies";
import { buildEmployerProfileCreateRow } from "@/lib/server/employer-portal";

function buildEmployerRegistrationError(input: {
  code: string;
  message: string;
  messageAr?: string;
  fieldErrors?: Record<string, string>;
  status?: number;
}) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: input.code,
        message: input.message,
      },
      details: input.fieldErrors || input.messageAr
        ? {
            ...(input.fieldErrors ? { fieldErrors: input.fieldErrors } : {}),
            ...(input.messageAr ? { messageAr: input.messageAr } : {}),
          }
        : undefined,
    },
    { status: input.status ?? 400 }
  );
}

async function rollbackEmployerRegistration(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  await Promise.allSettled([
    supabase.from("legal_acceptance_events").delete().eq("auth_user_id", authUserId),
    supabase.from("employers").delete().eq("auth_user_id", authUserId),
  ]);
  await supabase.auth.admin.deleteUser(authUserId).catch(() => undefined);
}

function mapEmployerInsertError(error: { code?: string; message: string }) {
  const message = error.message.toLowerCase();

  if (error.code === "23505" || message.includes("duplicate key value") || message.includes("unique constraint")) {
    if (message.includes("employers_commercial_registration_uq") || message.includes("commercial_registration_number")) {
      return buildEmployerRegistrationError({
        code: "COMMERCIAL_REGISTRATION_EXISTS",
        message: "A company with this commercial registration number already exists.",
        fieldErrors: {
          commercialRegistrationNumber: "A company with this commercial registration number already exists.",
        },
      });
    }

    if (message.includes("employers_tax_number_uq") || message.includes("tax_number")) {
      return buildEmployerRegistrationError({
        code: "TAX_NUMBER_EXISTS",
        message: "A company with this tax number already exists.",
        fieldErrors: {
          taxNumber: "A company with this tax number already exists.",
        },
      });
    }

    if (message.includes("employers_company_email_uq") || message.includes("company_email")) {
      return buildEmployerRegistrationError({
        code: "COMPANY_EMAIL_EXISTS",
        message: "This email is already associated with an employer account.",
        fieldErrors: {
          companyEmail: "This email is already associated with an employer account.",
        },
      });
    }
  }

  return buildEmployerRegistrationError({
    code: "EMPLOYER_CREATE_FAILED",
    message: "Unable to create the company profile at this time.",
    status: 400,
  });
}

function mapEmployerAuthError(error: { message?: string } | null) {
  const message = (error?.message ?? "").toLowerCase();

  if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
    return buildEmployerRegistrationError({
      code: "EMPLOYER_EMAIL_EXISTS",
      message: "This email is already associated with an employer account.",
      fieldErrors: {
        email: "This email is already associated with an employer account.",
      },
    });
  }

  return buildEmployerRegistrationError({
    code: "AUTH_REGISTER_FAILED",
    message: "Unable to create the employer account at this time.",
    status: 400,
  });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-register", 20);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const parsed = await parseJsonBody(request, employerRegistrationSchema);
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
    return mapEmployerAuthError(userError);
  }

  const { error: employerError } = await supabase.from("employers").insert(buildEmployerProfileCreateRow(userData.user.id, payload));

  if (employerError) {
    await supabase.auth.admin.deleteUser(userData.user.id);
    return mapEmployerInsertError(employerError);
  }

  const acceptedAt = new Date().toISOString();
  try {
    await persistLegalAcceptances([
      {
        userId: userData.user.id,
        role: "employer",
        documentName: "terms_of_service",
        documentVersion: LEGAL_DOCUMENT_VERSION,
        acceptedAt,
        ipAddress,
        userAgent,
      },
      {
        userId: userData.user.id,
        role: "employer",
        documentName: "privacy_policy",
        documentVersion: LEGAL_DOCUMENT_VERSION,
        acceptedAt,
        ipAddress,
        userAgent,
      },
      {
        userId: userData.user.id,
        role: "employer",
        documentName: "employer_agreement",
        documentVersion: LEGAL_DOCUMENT_VERSION,
        acceptedAt,
        ipAddress,
        userAgent,
      },
    ]);

    await createAuditLog({
      actorAuthUserId: userData.user.id,
      actorRole: "employer",
      action: "employer.legal_acceptance.persisted",
      targetType: "employer",
      targetId: userData.user.id,
      metadata: { documents: ["terms_of_service", "privacy_policy", "employer_agreement"] },
      ipAddress,
      userAgent,
    });
  } catch {
    await rollbackEmployerRegistration(userData.user.id);
    return buildEmployerRegistrationError({
      code: "LEGAL_ACCEPTANCE_PERSIST_FAILED",
      message: "Registration was not completed because the required agreements could not be recorded. Please try again.",
      messageAr: "لم يكتمل التسجيل لتعذر حفظ الموافقات القانونية المطلوبة. يرجى المحاولة مرة أخرى.",
      status: 500,
    });
  }

  const publicSupabase = createSupabasePublicClient();
  const { data: sessionData, error: sessionError } = await publicSupabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  const sessionRole = String(
    sessionData.user?.app_metadata?.app_role ?? sessionData.user?.user_metadata?.app_role ?? ""
  );
  if (sessionError || !sessionData.session || !sessionData.user || sessionRole !== "employer") {
    await rollbackEmployerRegistration(userData.user.id);
    return buildEmployerRegistrationError({
      code: "EMPLOYER_REGISTER_SESSION_FAILED",
      message: "Registration was not completed because secure sign-in could not be established. Please try again.",
      messageAr: "لم يكتمل التسجيل لتعذر إنشاء جلسة دخول آمنة. يرجى المحاولة مرة أخرى.",
      status: 500,
    });
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

  const response = NextResponse.json(
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

  setAuthCookies(response, {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
    expiresAt: sessionData.session.expires_at ?? null,
  });

  return response;
}
