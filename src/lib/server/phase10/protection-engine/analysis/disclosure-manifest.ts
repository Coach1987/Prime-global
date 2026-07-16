import type {
  DisclosureFieldCategory,
  DisclosureManifest,
  DisclosureManifestFieldEntry,
  DisclosureState,
  EmployerSafeDisclosureProjection,
  ProtectionLevel,
} from "./types.ts";
import { getFieldDefaultDisclosureState } from "./adaptive-protection.ts";

const DEFAULT_FIELDS: DisclosureFieldCategory[] = [
  "professional_name",
  "candidate_reference",
  "professional_title",
  "general_location",
  "experience",
  "skills",
  "education",
  "certifications",
  "languages",
  "portfolio",
  "availability",
  "salary_expectations",
  "work_authorization",
  "personal_email",
  "personal_phone",
  "precise_address",
  "passport_number",
  "national_id",
  "original_cv",
  "private_documents",
];

function isEmployerVisible(field: DisclosureFieldCategory, state: DisclosureState): boolean {
  if (field === "original_cv" || field === "private_documents" || field === "passport_number" || field === "national_id") {
    return false;
  }
  return state === "revealed" || state === "summarized" || state === "protected_placeholder" || state === "masked";
}

export function createDisclosureManifest(protectionLevel: ProtectionLevel): DisclosureManifest {
  const fields: DisclosureManifestFieldEntry[] = DEFAULT_FIELDS.map((fieldCategory) => {
    const state = getFieldDefaultDisclosureState(fieldCategory);

    return {
      fieldCategory,
      disclosureState: state,
      employerVisible: isEmployerVisible(fieldCategory, state),
      rationale: `Policy-managed state for ${fieldCategory}`,
    };
  });

  return {
    manifestId: `manifest:${Math.random().toString(36).slice(2, 12)}`,
    protectionLevel,
    fields,
    createdAt: new Date().toISOString(),
    schemaVersion: "stage8_5.disclosure-manifest.v1",
  };
}

export function updateManifestField(
  manifest: DisclosureManifest,
  fieldCategory: DisclosureFieldCategory,
  disclosureState: DisclosureState,
  rationale: string
): DisclosureManifest {
  return {
    ...manifest,
    fields: manifest.fields.map((field) => {
      if (field.fieldCategory !== fieldCategory) return field;
      return {
        ...field,
        disclosureState,
        employerVisible: isEmployerVisible(fieldCategory, disclosureState),
        rationale,
      };
    }),
  };
}

export function toEmployerSafeDisclosureProjection(analysisId: string, manifest: DisclosureManifest): EmployerSafeDisclosureProjection {
  return {
    analysisId,
    protectionLevel: manifest.protectionLevel,
    fields: manifest.fields
      .filter((field) => field.employerVisible)
      .map((field) => ({
        fieldCategory: field.fieldCategory,
        disclosureState: field.disclosureState,
      })),
  };
}
