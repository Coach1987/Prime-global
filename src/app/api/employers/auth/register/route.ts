import { NextResponse } from "next/server";
import { employerRegistrationSchema } from "@/features/employers/schemas/portal";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { createAuditLog } from "@/lib/server/security/audit";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { evaluateAgencyPolicy } from "@/lib/server/employer-policy";
import { LEGAL_DOCUMENT_VERSION, persistLegalAcceptances } from "@/lib/server/security/legal-acceptance";

function buildEmployerRegistrationError(input: {
  code: string;
  message: string;
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
      details: input.fieldErrors
        ? {
            fieldErrors: input.fieldErrors,
          }
        : undefined,
    },
    { status: input.status ?? 400 }
  );
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
    return mapEmployerInsertError(employerError);
  }

  try {
    const acceptedAt = new Date().toISOString();
    const requiredLegalAcceptances = [
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
    ] as const;

    await persistLegalAcceptances([
      ...requiredLegalAcceptances,
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown_error";

    if (/employer_agreement|document_name|check constraint|constraint/i.test(errorMessage)) {
      try {
        const acceptedAt = new Date().toISOString();
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
        ]);

        await createAuditLog({
          actorAuthUserId: userData.user.id,
          actorRole: "employer",
          action: "employer.legal_acceptance.persisted_with_fallback",
          targetType: "employer",
          targetId: userData.user.id,
          metadata: {
            persistedDocuments: ["terms_of_service", "privacy_policy"],
            employerAgreementAccepted: true,
            fallbackReason: errorMessage,
          },
          ipAddress,
          userAgent,
        });
      } catch {
        await createAuditLog({
          actorAuthUserId: userData.user.id,
          actorRole: "employer",
          action: "employer.legal_acceptance.persistence_failed",
          targetType: "employer",
          targetId: userData.user.id,
          metadata: {
            acceptedDocuments: ["terms_of_service", "privacy_policy", "employer_agreement"],
            failureStage: "fallback",
            fallbackReason: errorMessage,
          },
          ipAddress,
          userAgent,
        });
      }
    } else {
      await createAuditLog({
        actorAuthUserId: userData.user.id,
        actorRole: "employer",
        action: "employer.legal_acceptance.persistence_failed",
        targetType: "employer",
        targetId: userData.user.id,
        metadata: {
          acceptedDocuments: ["terms_of_service", "privacy_policy", "employer_agreement"],
          failureStage: "primary",
          failureReason: errorMessage,
        },
        ipAddress,
        userAgent,
      });
    }
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
