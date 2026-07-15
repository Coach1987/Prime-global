import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { readRequiredEnv } from "@/lib/server/config/env";

export const JOB_APPLICATION_STATUSES = ["new", "reviewing", "interview", "accepted", "rejected"] as const;

export type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number];

export interface JobApplicationRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  country_city: string | null;
  desired_position: string;
  years_of_experience: number | null;
  professional_message: string | null;
  cv_storage_path: string;
  original_cv_filename: string | null;
  cv_mime_type: string | null;
  cv_size_bytes: number | null;
  consent_accepted: boolean;
  status: JobApplicationStatus;
  locale: "en" | "ar" | null;
  created_at: string;
  updated_at: string;
}

function getCvBucketName() {
  return readRequiredEnv("SUPABASE_CV_BUCKET");
}

export async function listJobApplications(filters?: {
  status?: JobApplicationStatus;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = createSupabaseAdminClient();
  const limit = Math.min(Math.max(filters?.limit ?? 25, 1), 100);
  const offset = Math.max(filters?.offset ?? 0, 0);

  let query = supabase
    .from("job_applications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    const term = filters.search.trim();
    if (term) {
      query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,desired_position.ilike.%${term}%`);
    }
  }

  const { data, count, error } = await query;
  if (error) {
    throw new Error(`Failed to list job applications: ${error.message}`);
  }

  return {
    data: (data ?? []) as JobApplicationRecord[],
    count: count ?? 0,
    limit,
    offset,
  };
}

export async function updateJobApplicationStatus(id: string, status: JobApplicationStatus) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("job_applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update job application status: ${error.message}`);
  }

  return data as JobApplicationRecord;
}

export async function createCandidateCvSignedUrl(storagePath: string, expiresInSeconds = 60) {
  const supabase = createSupabaseAdminClient();
  const bucket = getCvBucketName();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, Math.max(30, Math.min(expiresInSeconds, 300)));

  if (error) {
    throw new Error(`Failed to create signed CV URL: ${error.message}`);
  }

  return data.signedUrl;
}
