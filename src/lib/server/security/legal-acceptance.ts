import { createSupabaseAdminClient } from "@/lib/server/supabase";

export const LEGAL_DOCUMENT_VERSION = "2026-07-23-v0.1-draft";

export type LegalDocumentName =
  | "terms_of_service"
  | "privacy_policy"
  | "employer_agreement";

type PersistLegalAcceptanceInput = {
  userId: string;
  role: "candidate" | "employer";
  documentName: LegalDocumentName;
  documentVersion: string;
  acceptedAt?: string;
  ipAddress?: string;
  userAgent?: string;
};

export async function persistLegalAcceptances(entries: PersistLegalAcceptanceInput[]) {
  if (entries.length === 0) return;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("legal_acceptance_events").insert(
    entries.map((entry) => ({
      auth_user_id: entry.userId,
      actor_role: entry.role,
      document_name: entry.documentName,
      document_version: entry.documentVersion,
      accepted_at: entry.acceptedAt ?? new Date().toISOString(),
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    }))
  );

  if (error) {
    throw new Error(error.message);
  }
}