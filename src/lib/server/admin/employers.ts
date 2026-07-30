import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { normalizeEmployerAccountStatus, type EmployerAccountStatus } from "@/lib/server/employers";

const COMPANY_DOCUMENT_BUCKET = process.env.SUPABASE_COMPANY_DOCS_BUCKET ?? "company-documents";

type EmployerRow = {
  id: string;
  auth_user_id: string;
  company_name: string;
  commercial_registration_number: string;
  tax_number: string;
  country: string;
  city: string;
  address: string;
  website: string | null;
  company_email: string;
  hr_contact: string;
  phone_number: string;
  logo_storage_path: string | null;
  industry: string;
  company_size: string;
  company_description: string;
  verification_status: string;
  verification_notes: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

type EmployerDocumentRow = {
  id: string;
  document_type: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
};

export type AdminEmployerListItem = {
  id: string;
  companyName: string;
  commercialRegistrationNumber: string;
  companyEmail: string;
  country: string;
  city: string;
  verificationStatus: string;
  accountStatus: EmployerAccountStatus | null;
  verificationNotes: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminEmployerDocument = {
  id: string;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  signedUrl: string | null;
};

export type EmployerDeletionPolicy = {
  allowed: boolean;
  reasons: string[];
  jobsCount: number;
  documentsCount: number;
};

export type AdminEmployerDetail = AdminEmployerListItem & {
  registration: {
    authUserId: string;
    accountEmail: string | null;
    registeredAt: string;
  };
  profile: {
    taxNumber: string;
    address: string;
    website: string | null;
    hrContact: string;
    phoneNumber: string;
    industry: string;
    companySize: string;
    companyDescription: string;
    logoStoragePath: string | null;
  };
  documents: AdminEmployerDocument[];
  deletionPolicy: EmployerDeletionPolicy;
};

function mapListItem(row: EmployerRow): AdminEmployerListItem {
  return {
    id: row.id,
    companyName: row.company_name,
    commercialRegistrationNumber: row.commercial_registration_number,
    companyEmail: row.company_email,
    country: row.country,
    city: row.city,
    verificationStatus: row.verification_status,
    accountStatus: normalizeEmployerAccountStatus(row.verification_status),
    verificationNotes: row.verification_notes,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getSignedDocumentUrl(storagePath: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.storage.from(COMPANY_DOCUMENT_BUCKET).createSignedUrl(storagePath, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function listAdminEmployers(input: { query?: string; status?: string }) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("employers").select("*").order("created_at", { ascending: false }).limit(100);

  const search = (input.query ?? "").trim();
  if (search) {
    query = query.or(
      [
        `company_name.ilike.%${search}%`,
        `commercial_registration_number.ilike.%${search}%`,
        `company_email.ilike.%${search}%`,
        `country.ilike.%${search}%`,
      ].join(",")
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  let items = ((data ?? []) as EmployerRow[]).map(mapListItem);
  if (input.status && input.status !== "all") {
    items = items.filter((item) => item.accountStatus === input.status);
  }

  return items;
}

export async function getEmployerDeletionPolicy(employer: Pick<EmployerRow, "id" | "verification_status">) {
  const supabase = createSupabaseAdminClient();
  const [{ count: jobsCount }, { count: documentsCount }] = await Promise.all([
    supabase.from("jobs").select("id", { head: true, count: "exact" }).eq("employer_id", employer.id),
    supabase.from("employer_verification_documents").select("id", { head: true, count: "exact" }).eq("employer_id", employer.id),
  ]);

  const reasons: string[] = [];
  const accountStatus = normalizeEmployerAccountStatus(employer.verification_status);

  if (accountStatus !== "rejected" && accountStatus !== "suspended") {
    reasons.push("Only rejected or suspended companies can be deleted.");
  }

  if ((jobsCount ?? 0) > 0) {
    reasons.push("Delete is blocked while the company still owns job records.");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    jobsCount: jobsCount ?? 0,
    documentsCount: documentsCount ?? 0,
  } satisfies EmployerDeletionPolicy;
}

export async function getAdminEmployerById(employerId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("employers").select("*").eq("id", employerId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const employer = (data as EmployerRow | null) ?? null;
  if (!employer) {
    return null;
  }

  const [{ data: documents }, authUserResult, deletionPolicy] = await Promise.all([
    supabase
      .from("employer_verification_documents")
      .select("id, document_type, storage_path, original_filename, mime_type, size_bytes, uploaded_at")
      .eq("employer_id", employer.id)
      .order("uploaded_at", { ascending: false }),
    supabase.auth.admin.getUserById(employer.auth_user_id),
    getEmployerDeletionPolicy(employer),
  ]);

  const documentRows = (documents ?? []) as EmployerDocumentRow[];
  const signedDocuments = await Promise.all(
    documentRows.map(async (document) => ({
      id: document.id,
      documentType: document.document_type,
      originalFilename: document.original_filename,
      mimeType: document.mime_type,
      sizeBytes: document.size_bytes,
      uploadedAt: document.uploaded_at,
      signedUrl: await getSignedDocumentUrl(document.storage_path),
    }))
  );

  const accountEmail = authUserResult.data.user?.email ?? null;
  const base = mapListItem(employer);

  return {
    ...base,
    registration: {
      authUserId: employer.auth_user_id,
      accountEmail,
      registeredAt: employer.created_at,
    },
    profile: {
      taxNumber: employer.tax_number,
      address: employer.address,
      website: employer.website,
      hrContact: employer.hr_contact,
      phoneNumber: employer.phone_number,
      industry: employer.industry,
      companySize: employer.company_size,
      companyDescription: employer.company_description,
      logoStoragePath: employer.logo_storage_path,
    },
    documents: signedDocuments,
    deletionPolicy,
  } satisfies AdminEmployerDetail;
}

async function syncEmployerAuthStatus(input: {
  authUserId: string;
  verificationStatus: string;
  accountStatus: EmployerAccountStatus;
}) {
  const supabase = createSupabaseAdminClient();
  await supabase.auth.admin.updateUserById(input.authUserId, {
    app_metadata: {
      app_role: "employer",
      account_status: input.accountStatus,
      verification_status: input.verificationStatus,
    },
    user_metadata: {
      account_status: input.accountStatus,
      verification_status: input.verificationStatus,
    },
  });
}

export async function applyAdminEmployerAction(input: {
  employerId: string;
  action: "approve" | "reject" | "suspend" | "reactivate" | "delete";
  reason?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("employers").select("*").eq("id", input.employerId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const employer = (data as EmployerRow | null) ?? null;
  if (!employer) {
    return { kind: "not_found" as const };
  }

  if (input.action === "delete") {
    const deletionPolicy = await getEmployerDeletionPolicy(employer);
    if (!deletionPolicy.allowed) {
      return { kind: "blocked" as const, deletionPolicy };
    }

    const { data: documents } = await supabase
      .from("employer_verification_documents")
      .select("storage_path")
      .eq("employer_id", employer.id);

    const storagePaths = (documents ?? [])
      .map((item) => String((item as { storage_path?: string }).storage_path ?? ""))
      .filter(Boolean);

    if (storagePaths.length > 0) {
      await supabase.storage.from(COMPANY_DOCUMENT_BUCKET).remove(storagePaths);
    }

    await supabase.from("employers").delete().eq("id", employer.id);
    await supabase.auth.admin.deleteUser(employer.auth_user_id);

    return { kind: "deleted" as const, employerId: employer.id };
  }

  const nowIso = new Date().toISOString();
  const patch: Partial<EmployerRow> = {};

  if (input.action === "approve") {
    patch.verification_status = "verified";
    patch.verification_notes = input.reason ?? null;
    patch.verified_at = nowIso;
  }

  if (input.action === "reject") {
    patch.verification_status = "rejected";
    patch.verification_notes = input.reason ?? null;
    patch.verified_at = null;
  }

  if (input.action === "suspend") {
    patch.verification_status = "suspended";
    patch.verification_notes = input.reason ?? null;
  }

  if (input.action === "reactivate") {
    patch.verification_status = "verified";
    patch.verification_notes = input.reason ?? employer.verification_notes;
    patch.verified_at = employer.verified_at ?? nowIso;
  }

  const { error: updateError } = await supabase.from("employers").update(patch).eq("id", employer.id);
  if (updateError) {
    throw new Error(updateError.message);
  }

  const nextVerificationStatus = String(patch.verification_status ?? employer.verification_status);
  const nextAccountStatus = normalizeEmployerAccountStatus(nextVerificationStatus);
  if (nextAccountStatus) {
    await syncEmployerAuthStatus({
      authUserId: employer.auth_user_id,
      verificationStatus: nextVerificationStatus,
      accountStatus: nextAccountStatus,
    });
  }

  const nextDetail = await getAdminEmployerById(employer.id);
  return { kind: "updated" as const, employer: nextDetail };
}