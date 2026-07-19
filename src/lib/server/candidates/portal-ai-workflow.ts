import {
  createCandidateDocumentAnalysis,
  createSmartJobMatch,
  generateCandidateProfileFromDocuments,
  listCandidateCanonicalProfiles,
  listSmartJobMatches,
} from "@/lib/server/enterprise/ai-recruitment-intelligence/repository";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

interface EventRouting {
  eventTypeId: string;
  categoryId: string;
  channelId: string;
  publisherId: string;
  queueId: string;
}

function normalizeDate(input?: string | null) {
  if (!input) return undefined;
  const value = input.trim();
  if (!value) return undefined;
  if (/^\d{4}$/.test(value)) return `${value}-01-01`;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return undefined;
}

async function ensureEventRouting(): Promise<EventRouting | null> {
  const supabase = createSupabaseAdminClient();

  const [type, category, channel, publisher, queue] = await Promise.all([
    supabase.from("pgems_event_types").select("id, category_id").eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("pgems_event_categories").select("id").eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("pgems_event_channels").select("id").eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("pgems_event_publishers").select("id").eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("pgems_event_queues").select("id").eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);

  const eventTypeId = type.data?.id;
  const categoryId = type.data?.category_id ?? category.data?.id;
  const channelId = channel.data?.id;
  const publisherId = publisher.data?.id;
  const queueId = queue.data?.id;

  if (!eventTypeId || !categoryId || !channelId || !publisherId || !queueId) {
    return null;
  }

  return {
    eventTypeId,
    categoryId,
    channelId,
    publisherId,
    queueId,
  };
}

async function ensureAiTaskId(taskType: "extraction" | "matching") {
  const supabase = createSupabaseAdminClient();
  const existing = await supabase
    .from("pgems_ai_tasks")
    .select("id")
    .eq("task_type", taskType)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) return existing.data.id as string;

  const code = `candidate_portal_${taskType}_auto`;
  const inserted = await supabase
    .from("pgems_ai_tasks")
    .insert({
      code,
      name: `Candidate Portal ${taskType}`,
      task_type: taskType,
      locale: "en",
      metadata: { source: "candidate_portal_workflow" },
      is_active: true,
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data?.id) return null;
  return inserted.data.id as string;
}

async function findDefaultPromptVersionId(taskId: string) {
  const supabase = createSupabaseAdminClient();
  const task = await supabase.from("pgems_ai_tasks").select("prompt_id").eq("id", taskId).maybeSingle();
  const promptId = task.data?.prompt_id;
  if (!promptId) return undefined;

  const version = await supabase
    .from("pgems_ai_prompt_versions")
    .select("id")
    .eq("prompt_id", promptId)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return version.data?.id as string | undefined;
}

function mapDocumentType(documentType: string):
  | "cv_resume"
  | "diploma"
  | "certificate"
  | "training_certificate"
  | "language_certificate"
  | "identity_document"
  | "portfolio"
  | "future" {
  if (documentType === "cv") return "cv_resume";
  if (documentType === "diploma") return "diploma";
  if (documentType === "certificate") return "certificate";
  if (documentType === "language_certificate") return "language_certificate";
  if (documentType === "identity_document") return "identity_document";
  if (documentType === "portfolio") return "portfolio";
  if (documentType === "training_certificate") return "training_certificate";
  return "future";
}

export async function createCandidateNotification(input: {
  authUserId: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
}) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("notification_events").insert({
    auth_user_id: input.authUserId,
    category: "status_change",
    title: input.title,
    body: input.body,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    delivery_channels: ["dashboard", "realtime"],
  });
}

export async function syncCandidatePortalAiWorkflow(input: {
  candidateId: string;
  authUserId: string;
  locale?: string;
  trigger?: "profile_update" | "document_upload" | "matching_refresh";
}) {
  const supabase = createSupabaseAdminClient();
  const locale = input.locale ?? "en";

  const [candidateRes, professionalRes, versionsRes] = await Promise.all([
    supabase.from("candidate_profiles").select("id, professional_title, bio, country, city").eq("id", input.candidateId).maybeSingle(),
    supabase
      .from("candidate_professional_profiles")
      .select("headline, biography, experiences, education_entries, certificates, skills, languages, availability")
      .eq("candidate_id", input.candidateId)
      .maybeSingle(),
    supabase
      .from("candidate_document_versions")
      .select("id, document_type, storage_path, content_hash, original_filename, verification_status, created_at")
      .eq("candidate_id", input.candidateId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!candidateRes.data) return { synced: false, reason: "candidate_missing" };

  const documents = (versionsRes.data ?? []).filter((entry) => typeof entry.storage_path === "string" && entry.storage_path.length > 0);
  if (documents.length === 0) return { synced: false, reason: "documents_missing" };

  const extractionTaskId = await ensureAiTaskId("extraction");
  const matchingTaskId = await ensureAiTaskId("matching");
  const routing = await ensureEventRouting();
  if (!extractionTaskId || !matchingTaskId || !routing) {
    return { synced: false, reason: "ai_or_event_config_missing" };
  }

  const extractionPromptVersionId = await findDefaultPromptVersionId(extractionTaskId);
  const matchingPromptVersionId = await findDefaultPromptVersionId(matchingTaskId);

  const documentAnalysisIds: string[] = [];
  for (const doc of documents) {
    const hash = typeof doc.content_hash === "string" && doc.content_hash.trim().length > 0
      ? doc.content_hash
      : `${input.candidateId}:${doc.id}`;

    const existing = await supabase
      .from("pgems_ai_candidate_document_analyses")
      .select("id")
      .eq("candidate_id", input.candidateId)
      .eq("document_hash", hash)
      .maybeSingle();

    if (existing.data?.id) {
      documentAnalysisIds.push(existing.data.id as string);
      continue;
    }

    const analysis = await createCandidateDocumentAnalysis({
      candidateId: input.candidateId,
      documentType: mapDocumentType(String(doc.document_type ?? "future")),
      storagePath: String(doc.storage_path),
      documentHash: hash,
      locale,
      analysisSummary: `Candidate portal ingestion for ${String(doc.original_filename ?? doc.document_type ?? "document")}`,
      extractedPayload: {
        documentType: doc.document_type,
        verificationStatus: doc.verification_status,
      },
      metadata: {
        source: "candidate_portal_sync",
        versionId: doc.id,
      },
    });

    documentAnalysisIds.push(analysis.id);
  }

  if (documentAnalysisIds.length === 0) return { synced: false, reason: "analysis_missing" };

  const professional = (professionalRes.data ?? {}) as Record<string, unknown>;
  const candidate = candidateRes.data;

  const primaryDocRef = String(documents[0]?.storage_path ?? "candidate-profile");
  const nowIso = new Date().toISOString();

  const experiences = Array.isArray(professional.experiences) ? professional.experiences as Array<Record<string, unknown>> : [];
  const educations = Array.isArray(professional.education_entries) ? professional.education_entries as Array<Record<string, unknown>> : [];
  const certificates = Array.isArray(professional.certificates) ? professional.certificates as Array<Record<string, unknown>> : [];
  const skills = Array.isArray(professional.skills) ? professional.skills as string[] : [];
  const languages = Array.isArray(professional.languages) ? professional.languages as string[] : [];

  const profileResult = await generateCandidateProfileFromDocuments({
    candidateId: input.candidateId,
    documentAnalysisIds,
    aiTaskId: extractionTaskId,
    aiPromptVersionId: extractionPromptVersionId,
    locale,
    inputPayload: {
      trigger: input.trigger ?? "profile_update",
      candidateId: input.candidateId,
      documentCount: documents.length,
    },
    profileDraft: {
      headline: typeof professional.headline === "string" && professional.headline.trim().length > 0
        ? professional.headline
        : typeof candidate.professional_title === "string"
          ? candidate.professional_title
          : undefined,
      summary:
        typeof professional.biography === "string" && professional.biography.trim().length > 0
          ? professional.biography
          : typeof candidate.bio === "string"
            ? candidate.bio
            : "",
    },
    extracted: {
      skills: skills.map((skill) => ({
        rawSkill: String(skill),
        normalizedSkillName: String(skill),
        proficiencyLevel: "intermediate",
        confidenceScore: 0.72,
        extractionSource: "candidate_portal_sync",
        documentReference: primaryDocRef,
        aiModelUsed: "candidate-intelligence-portal-sync",
        extractionTimestamp: nowIso,
        metadata: {},
      })),
      experiences: experiences.map((item) => ({
        roleTitle: String(item.role ?? "Experience"),
        organizationName: String(item.company ?? "Unknown"),
        startDate: normalizeDate(typeof item.startDate === "string" ? item.startDate : undefined),
        endDate: normalizeDate(typeof item.endDate === "string" ? item.endDate : undefined),
        isCurrent: !(typeof item.endDate === "string" && item.endDate.trim().length > 0),
        description: String(item.summary ?? ""),
        confidenceScore: 0.7,
        extractionSource: "candidate_portal_sync",
        documentReference: primaryDocRef,
        aiModelUsed: "candidate-intelligence-portal-sync",
        extractionTimestamp: nowIso,
        metadata: {},
      })),
      educations: educations.map((item) => ({
        institutionName: String(item.institution ?? "Unknown institution"),
        degreeTitle: String(item.degree ?? "Qualification"),
        endDate: normalizeDate(typeof item.year === "string" ? item.year : undefined),
        confidenceScore: 0.68,
        extractionSource: "candidate_portal_sync",
        documentReference: primaryDocRef,
        aiModelUsed: "candidate-intelligence-portal-sync",
        extractionTimestamp: nowIso,
        metadata: {},
      })),
      certifications: certificates.map((item) => ({
        certificationName: String(item.title ?? "Certificate"),
        issuingOrganization: String(item.issuer ?? ""),
        issueDate: normalizeDate(typeof item.year === "string" ? item.year : undefined),
        confidenceScore: 0.66,
        extractionSource: "candidate_portal_sync",
        documentReference: primaryDocRef,
        aiModelUsed: "candidate-intelligence-portal-sync",
        extractionTimestamp: nowIso,
        metadata: {},
      })),
      languages: languages.map((language) => ({
        languageName: String(language),
        proficiencyLevel: "professional",
        confidenceScore: 0.7,
        extractionSource: "candidate_portal_sync",
        documentReference: primaryDocRef,
        aiModelUsed: "candidate-intelligence-portal-sync",
        extractionTimestamp: nowIso,
        metadata: {},
      })),
    },
    eventRouting: routing,
    metadata: {
      source: "candidate_portal_workflow",
    },
  });

  await createCandidateNotification({
    authUserId: input.authUserId,
    title: "Profile ready",
    body: "Your canonical professional profile is ready for review.",
    entityType: "candidate_profile",
    entityId: profileResult.profile.id,
  });

  await createCandidateNotification({
    authUserId: input.authUserId,
    title: "Review requested",
    body: "Prime Global staff review has started for your profile.",
    entityType: "candidate_review",
    entityId: profileResult.review.id,
  });

  const canonicalProfiles = await listCandidateCanonicalProfiles();
  const latestCanonical = canonicalProfiles
    .filter((row) => row.candidate_id === input.candidateId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0] ?? null;

  if (!latestCanonical) {
    return {
      synced: true,
      profileId: profileResult.profile.id,
      matchedJobs: 0,
      canonicalProfileId: null,
    };
  }

  const jobsResult = await supabase
    .from("jobs")
    .select("id, title, required_skills, employment_type, country, city, department, experience, education")
    .eq("status", "published")
    .order("publish_date", { ascending: false })
    .limit(20);

  const jobs = jobsResult.data ?? [];
  const existingMatches = await listSmartJobMatches();
  const existingKey = new Set(
    existingMatches
      .filter((row) => row.candidate_id === input.candidateId && row.canonical_profile_id === latestCanonical.id)
      .map((row) => `${row.job_id}:${row.canonical_profile_id}`)
  );

  let createdMatches = 0;
  for (const job of jobs) {
    const key = `${job.id}:${latestCanonical.id}`;
    if (existingKey.has(key)) continue;

    await createSmartJobMatch({
      candidateId: input.candidateId,
      canonicalProfileId: latestCanonical.id,
      aiTaskId: matchingTaskId,
      aiPromptVersionId: matchingPromptVersionId,
      locale,
      inputPayload: {
        trigger: "candidate_portal_workflow",
        candidateId: input.candidateId,
        jobId: job.id,
      },
      aiModelUsed: "smart-matching-portal-sync",
      jobProfile: {
        jobId: String(job.id),
        title: String(job.title),
        requiredSkills: Array.isArray(job.required_skills) ? job.required_skills.map((item) => String(item)) : [],
        preferredSkills: [],
        requiredEducationLevels: typeof job.education === "string" && job.education.trim().length > 0 ? [job.education] : [],
        requiredCertifications: [],
        requiredLanguages: [],
        country: typeof job.country === "string" ? job.country : undefined,
        region: typeof job.city === "string" ? job.city : undefined,
        workAuthorizationRequired: false,
        employmentType: typeof job.employment_type === "string" ? job.employment_type : undefined,
        industry: typeof job.department === "string" ? job.department : undefined,
        specialization: typeof job.department === "string" ? job.department : undefined,
        availability: typeof professional.availability === "string" ? professional.availability : undefined,
        careerLevel: typeof job.experience === "string" ? job.experience : undefined,
        jobFunction: typeof job.department === "string" ? job.department : undefined,
      },
      candidateContext: {
        country: typeof candidate.country === "string" ? candidate.country : undefined,
        region: typeof candidate.city === "string" ? candidate.city : undefined,
        employmentType: typeof job.employment_type === "string" ? job.employment_type : undefined,
        availability: typeof professional.availability === "string" ? professional.availability : undefined,
        careerLevel: typeof job.experience === "string" ? job.experience : undefined,
      },
      eventRouting: routing,
      metadata: {
        source: "candidate_portal_workflow",
      },
    });

    createdMatches += 1;
  }

  if (createdMatches > 0) {
    await createCandidateNotification({
      authUserId: input.authUserId,
      title: "New matching jobs",
      body: `${createdMatches} new job matches are ready in your candidate portal.`,
      entityType: "candidate_matching",
      entityId: latestCanonical.id,
    });
  }

  return {
    synced: true,
    profileId: profileResult.profile.id,
    canonicalProfileId: latestCanonical.id,
    matchedJobs: createdMatches,
  };
}
