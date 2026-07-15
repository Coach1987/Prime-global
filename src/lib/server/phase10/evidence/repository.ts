import { createSupabaseAdminClient } from "../../supabase.ts";
import type {
  Phase10EvidenceAccessAuditRecord,
  Phase10EvidenceEventRecord,
  Phase10EvidenceRepository,
} from "./types.ts";

export function createSupabasePhase10EvidenceRepository(): Phase10EvidenceRepository {
  const supabase = createSupabaseAdminClient();

  return {
    async insertEvidenceEvent(input) {
      const { data, error } = await supabase.from("shield_evidence_events").insert(input).select("*").single();
      if (error || !data) throw new Error(error?.message ?? "Unable to insert evidence event");
      return data as Phase10EvidenceEventRecord;
    },

    async findEvidenceEventById(id) {
      const { data, error } = await supabase.from("shield_evidence_events").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Phase10EvidenceEventRecord | null) ?? null;
    },

    async findEvidenceEventsByCaseId(evidenceCaseId) {
      const { data, error } = await supabase
        .from("shield_evidence_events")
        .select("*")
        .eq("evidence_case_id", evidenceCaseId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Phase10EvidenceEventRecord[];
    },

    async findLatestEvidenceEventByCaseId(evidenceCaseId) {
      const { data, error } = await supabase
        .from("shield_evidence_events")
        .select("*")
        .eq("evidence_case_id", evidenceCaseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Phase10EvidenceEventRecord | null) ?? null;
    },

    async insertEvidenceAccessAudit(input: Omit<Phase10EvidenceAccessAuditRecord, "id" | "created_at">) {
      const { data, error } = await supabase.from("shield_evidence_access_audit").insert(input).select("*").single();
      if (error || !data) throw new Error(error?.message ?? "Unable to insert evidence access audit");
      return data as Phase10EvidenceAccessAuditRecord;
    },
  };
}
