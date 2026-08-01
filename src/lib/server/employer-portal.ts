import type { ZodError } from "zod";
import type {
  EmployerProfileCreateInput,
} from "@/features/employers/schemas/portal";
import type { EmployerRegistrationInput } from "@/features/employers/schemas/portal";
import type { z } from "zod";
import type { companyVerificationRequestSchema } from "@/features/employers/schemas/verification-v2";

type CompanyVerificationRequestInput = z.infer<typeof companyVerificationRequestSchema>;

export function buildEmployerProfileCreateRow(authUserId: string, payload: EmployerProfileCreateInput | EmployerRegistrationInput) {
  return {
    auth_user_id: authUserId,
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
    verification_status: "pending" as const,
  };
}

export function buildCompanyVerificationRequestRow(employerId: string, payload: CompanyVerificationRequestInput) {
  return {
    employer_id: employerId,
    company_name: payload.companyName,
    commercial_registration_number: payload.commercialRegistrationNumber,
    tax_number: payload.taxNumber,
    country: payload.country,
    address: payload.address,
    official_email: payload.officialEmail,
    website: payload.website || null,
    phone_number: payload.phoneNumber,
    responsible_person: payload.responsiblePerson,
    status: "pending" as const,
    reviewer_notes: null,
    reviewed_by: null,
    reviewed_at: null,
  };
}

export function mapZodFieldErrors(error: ZodError) {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}