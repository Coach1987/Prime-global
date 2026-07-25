import { NextResponse } from "next/server";
import {
  consumeRecruitmentEventSchema,
  createSmartJobMatchSchema,
  createCandidateAiRecommendationSchema,
  createCandidateCertificationExtractionSchema,
  createCandidateConfidenceScoreSchema,
  createCandidateDocumentAnalysisSchema,
  createCandidateEducationExtractionSchema,
  createCandidateExperienceExtractionSchema,
  createCandidateLanguageExtractionSchema,
  createCandidateProfessionalProfileSchema,
  createCandidateReviewStatusSchema,
  createCandidateSkillExtractionSchema,
  createCandidateTimelineEntrySchema,
  createSkillAliasSchema,
  createSkillTaxonomySchema,
  generateCandidateProfileSchema,
  updateCandidateConflictSchema,
  updateCandidateReviewStatusSchema,
  updateSmartJobMatchReviewSchema,
} from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { canonicalizeSkillKey } from "@/lib/server/enterprise/ai-recruitment-intelligence";
import {
  consumeRecruitmentIntelligenceEvent,
  createCandidateAiRecommendation,
  createCandidateCertificationExtraction,
  createCandidateConfidenceScore,
  createCandidateDocumentAnalysis,
  createCandidateEducationExtraction,
  createCandidateExperienceExtraction,
  createCandidateLanguageExtraction,
  createCandidateProfessionalProfile,
  createCandidateReviewStatus,
  createCandidateSkillExtraction,
  createCandidateTimelineEntry,
  createSkillAlias,
  createSkillTaxonomyEntry,
  generateCandidateProfileFromDocuments,
  listCandidateAiRecommendations,
  listCandidateCanonicalProfileFields,
  listCandidateCanonicalProfiles,
  listCandidateCanonicalTimelineEntries,
  listCandidateCertificationExtractions,
  listCandidateConflicts,
  listCandidateConfidenceScores,
  listCandidateDocumentAnalyses,
  listCandidateEducationExtractions,
  listCandidateExperienceExtractions,
  listCandidateKnowledgeGraphEdges,
  listCandidateKnowledgeGraphNodes,
  listCandidateLanguageExtractions,
  listCandidateProfessionalProfiles,
  listCandidateReviewItems,
  listCandidateReviewStatuses,
  listCandidateSkillExtractions,
  listCandidateTimelineEntries,
  listSmartJobMatches,
  listSmartJobMatchReviews,
  listSkillAliases,
  listSkillTaxonomy,
  createSmartJobMatch,
  updateCandidateConflictStatus,
  updateCandidateReviewStatus,
  updateSmartJobMatchReview,
} from "../../../../../lib/server/enterprise/ai-recruitment-intelligence/repository";
import { requireAiRecruitmentIntelligenceAccess } from "../_shared.ts";

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

async function ensureAccess(request: Request) {
  const auth = await requireAiRecruitmentIntelligenceAccess(request);
  if (auth instanceof NextResponse) return auth;
  return null;
}

async function handleDocumentAnalyses(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateDocumentAnalyses() });

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCandidateDocumentAnalysisSchema);
    if (parsed.error) return parsed.error;

    const data = await createCandidateDocumentAnalysis({
      candidateId: parsed.data.candidateId,
      documentType: parsed.data.documentType,
      storagePath: parsed.data.storagePath,
      documentHash: parsed.data.documentHash,
      locale: parsed.data.locale ?? "en",
      analysisSummary: parsed.data.analysisSummary ?? "",
      extractedPayload: parsed.data.extractedPayload ?? {},
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleProfiles(request: Request, segments: string[]) {
  if (segments.length === 1) {
    if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateProfessionalProfiles() });

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createCandidateProfessionalProfileSchema);
      if (parsed.error) return parsed.error;

      const data = await createCandidateProfessionalProfile({
        candidateId: parsed.data.candidateId,
        headline: parsed.data.headline,
        summary: parsed.data.summary ?? "",
        locale: parsed.data.locale ?? "en",
        sourceDocumentAnalysisIds: parsed.data.sourceDocumentAnalysisIds ?? [],
        metadata: parsed.data.metadata ?? {},
      });

      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  }

  if (segments.length === 2 && segments[1] === "generate" && request.method === "POST") {
    const parsed = await parseJsonBody(request, generateCandidateProfileSchema);
    if (parsed.error) return parsed.error;

    const profileDraft = parsed.data.profileDraft ?? { summary: "" };
    const extracted = parsed.data.extracted;

    const data = await generateCandidateProfileFromDocuments({
      candidateId: parsed.data.candidateId,
      documentAnalysisIds: parsed.data.documentAnalysisIds,
      aiTaskId: parsed.data.aiTaskId,
      aiPromptVersionId: parsed.data.aiPromptVersionId,
      locale: parsed.data.locale ?? "en",
      inputPayload: parsed.data.inputPayload ?? {},
      profileDraft: {
        headline: profileDraft.headline,
        summary: profileDraft.summary ?? "",
      },
      extracted: {
        skills: (extracted?.skills ?? []).map((item) => ({
          ...item,
          proficiencyLevel: item.proficiencyLevel ?? "intermediate",
          metadata: item.metadata ?? {},
        })),
        experiences: (extracted?.experiences ?? []).map((item) => ({
          ...item,
          isCurrent: item.isCurrent ?? false,
          description: item.description ?? "",
          metadata: item.metadata ?? {},
        })),
        educations: (extracted?.educations ?? []).map((item) => ({
          ...item,
          metadata: item.metadata ?? {},
        })),
        certifications: (extracted?.certifications ?? []).map((item) => ({
          ...item,
          metadata: item.metadata ?? {},
        })),
        languages: (extracted?.languages ?? []).map((item) => ({
          ...item,
          proficiencyLevel: item.proficiencyLevel ?? "conversational",
          metadata: item.metadata ?? {},
        })),
      },
      eventRouting: parsed.data.eventRouting,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("NOT_FOUND", "Profile endpoint not found", 404);
}

async function handleSkillTaxonomy(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listSkillTaxonomy() });

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createSkillTaxonomySchema);
    if (parsed.error) return parsed.error;

    const data = await createSkillTaxonomyEntry({
      canonicalCode: parsed.data.canonicalCode,
      canonicalName: parsed.data.canonicalName,
      category: parsed.data.category,
      locale: parsed.data.locale ?? "en",
      normalizedKey: canonicalizeSkillKey(parsed.data.canonicalName),
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleSkillAliases(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listSkillAliases() });

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createSkillAliasSchema);
    if (parsed.error) return parsed.error;

    const data = await createSkillAlias({
      taxonomyId: parsed.data.taxonomyId,
      aliasText: parsed.data.aliasText,
      locale: parsed.data.locale ?? "en",
      normalizedKey: canonicalizeSkillKey(parsed.data.aliasText),
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleSkills(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateSkillExtractions() });

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCandidateSkillExtractionSchema);
    if (parsed.error) return parsed.error;

    const data = await createCandidateSkillExtraction({
      profileId: parsed.data.profileId,
      candidateId: parsed.data.candidateId,
      rawSkill: parsed.data.rawSkill,
      normalizedTaxonomyId: parsed.data.normalizedTaxonomyId,
      normalizedSkillName: parsed.data.normalizedSkillName,
      proficiencyLevel: parsed.data.proficiencyLevel ?? "intermediate",
      confidenceScore: parsed.data.confidenceScore,
      extractionSource: parsed.data.extractionSource,
      documentReference: parsed.data.documentReference,
      aiModelUsed: parsed.data.aiModelUsed,
      extractionTimestamp: parsed.data.extractionTimestamp,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleExperiences(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateExperienceExtractions() });

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCandidateExperienceExtractionSchema);
    if (parsed.error) return parsed.error;

    const data = await createCandidateExperienceExtraction({
      profileId: parsed.data.profileId,
      candidateId: parsed.data.candidateId,
      roleTitle: parsed.data.roleTitle,
      organizationName: parsed.data.organizationName,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      isCurrent: parsed.data.isCurrent ?? false,
      description: parsed.data.description ?? "",
      confidenceScore: parsed.data.confidenceScore,
      extractionSource: parsed.data.extractionSource,
      documentReference: parsed.data.documentReference,
      aiModelUsed: parsed.data.aiModelUsed,
      extractionTimestamp: parsed.data.extractionTimestamp,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleEducations(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateEducationExtractions() });

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCandidateEducationExtractionSchema);
    if (parsed.error) return parsed.error;

    const data = await createCandidateEducationExtraction({
      profileId: parsed.data.profileId,
      candidateId: parsed.data.candidateId,
      institutionName: parsed.data.institutionName,
      degreeTitle: parsed.data.degreeTitle,
      fieldOfStudy: parsed.data.fieldOfStudy,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      grade: parsed.data.grade,
      confidenceScore: parsed.data.confidenceScore,
      extractionSource: parsed.data.extractionSource,
      documentReference: parsed.data.documentReference,
      aiModelUsed: parsed.data.aiModelUsed,
      extractionTimestamp: parsed.data.extractionTimestamp,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleCertifications(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateCertificationExtractions() });

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCandidateCertificationExtractionSchema);
    if (parsed.error) return parsed.error;

    const data = await createCandidateCertificationExtraction({
      profileId: parsed.data.profileId,
      candidateId: parsed.data.candidateId,
      certificationName: parsed.data.certificationName,
      issuingOrganization: parsed.data.issuingOrganization,
      issueDate: parsed.data.issueDate,
      expiryDate: parsed.data.expiryDate,
      credentialId: parsed.data.credentialId,
      confidenceScore: parsed.data.confidenceScore,
      extractionSource: parsed.data.extractionSource,
      documentReference: parsed.data.documentReference,
      aiModelUsed: parsed.data.aiModelUsed,
      extractionTimestamp: parsed.data.extractionTimestamp,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleLanguages(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateLanguageExtractions() });

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCandidateLanguageExtractionSchema);
    if (parsed.error) return parsed.error;

    const data = await createCandidateLanguageExtraction({
      profileId: parsed.data.profileId,
      candidateId: parsed.data.candidateId,
      languageName: parsed.data.languageName,
      normalizedCode: parsed.data.normalizedCode,
      proficiencyLevel: parsed.data.proficiencyLevel ?? "conversational",
      confidenceScore: parsed.data.confidenceScore,
      extractionSource: parsed.data.extractionSource,
      documentReference: parsed.data.documentReference,
      aiModelUsed: parsed.data.aiModelUsed,
      extractionTimestamp: parsed.data.extractionTimestamp,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleTimeline(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateTimelineEntries() });

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCandidateTimelineEntrySchema);
    if (parsed.error) return parsed.error;

    const data = await createCandidateTimelineEntry({
      profileId: parsed.data.profileId,
      candidateId: parsed.data.candidateId,
      entryType: parsed.data.entryType,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleConfidenceScores(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateConfidenceScores() });

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCandidateConfidenceScoreSchema);
    if (parsed.error) return parsed.error;

    const data = await createCandidateConfidenceScore({
      profileId: parsed.data.profileId,
      candidateId: parsed.data.candidateId,
      overallConfidence: parsed.data.overallConfidence,
      skillsConfidence: parsed.data.skillsConfidence ?? 0,
      experienceConfidence: parsed.data.experienceConfidence ?? 0,
      educationConfidence: parsed.data.educationConfidence ?? 0,
      certificationConfidence: parsed.data.certificationConfidence ?? 0,
      languageConfidence: parsed.data.languageConfidence ?? 0,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleReviewStatus(request: Request, segments: string[]) {
  if (segments.length === 1) {
    if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateReviewStatuses() });

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createCandidateReviewStatusSchema);
      if (parsed.error) return parsed.error;

      const data = await createCandidateReviewStatus({
        profileId: parsed.data.profileId,
        candidateId: parsed.data.candidateId,
        status: parsed.data.status ?? "pending_review",
        reviewerStaffId: parsed.data.reviewerStaffId,
        reviewNotes: parsed.data.reviewNotes,
        metadata: parsed.data.metadata ?? {},
      });

      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  }

  if (segments.length === 3 && segments[2] === "update" && request.method === "POST") {
    const parsed = await parseJsonBody(request, updateCandidateReviewStatusSchema);
    if (parsed.error) return parsed.error;

    const data = await updateCandidateReviewStatus({
      reviewId: segments[1],
      status: parsed.data.status ?? "pending_review",
      reviewerStaffId: parsed.data.reviewerStaffId,
      reviewNotes: parsed.data.reviewNotes,
      eventRouting: parsed.data.eventRouting,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data });
  }

  return jsonError("NOT_FOUND", "Review status endpoint not found", 404);
}

async function handleCanonicalProfiles(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateCanonicalProfiles() });
  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleCanonicalFields(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateCanonicalProfileFields() });
  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleConflicts(request: Request, segments: string[]) {
  if (segments.length === 1 && request.method === "GET") {
    return NextResponse.json({ success: true, data: await listCandidateConflicts() });
  }

  if (segments.length === 3 && segments[2] === "update" && request.method === "POST") {
    const parsed = await parseJsonBody(request, updateCandidateConflictSchema);
    if (parsed.error) return parsed.error;

    const data = await updateCandidateConflictStatus({
      conflictId: segments[1],
      status: parsed.data.status,
      reviewerStaffId: parsed.data.reviewerStaffId,
      resolutionNotes: parsed.data.resolutionNotes,
      eventRouting: parsed.data.eventRouting,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data });
  }

  return jsonError("NOT_FOUND", "Conflicts endpoint not found", 404);
}

async function handleReviewItems(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateReviewItems() });
  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleCanonicalTimeline(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateCanonicalTimelineEntries() });
  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleKnowledgeGraph(request: Request, segments: string[]) {
  if (segments.length === 2 && segments[1] === "nodes" && request.method === "GET") {
    return NextResponse.json({ success: true, data: await listCandidateKnowledgeGraphNodes() });
  }
  if (segments.length === 2 && segments[1] === "edges" && request.method === "GET") {
    return NextResponse.json({ success: true, data: await listCandidateKnowledgeGraphEdges() });
  }
  return jsonError("NOT_FOUND", "Knowledge graph endpoint not found", 404);
}

async function handleRecommendations(request: Request) {
  if (request.method === "GET") return NextResponse.json({ success: true, data: await listCandidateAiRecommendations() });

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCandidateAiRecommendationSchema);
    if (parsed.error) return parsed.error;

    const data = await createCandidateAiRecommendation({
      profileId: parsed.data.profileId,
      candidateId: parsed.data.candidateId,
      recommendation: parsed.data.recommendation,
      recommendationSummary: parsed.data.recommendationSummary ?? "",
      advisoryOnly: parsed.data.advisoryOnly ?? true,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleSmartMatching(request: Request, segments: string[]) {
  if (segments.length === 1) {
    if (request.method === "GET") return NextResponse.json({ success: true, data: await listSmartJobMatches() });

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createSmartJobMatchSchema);
      if (parsed.error) return parsed.error;

      const data = await createSmartJobMatch({
        candidateId: parsed.data.candidateId,
        canonicalProfileId: parsed.data.canonicalProfileId,
        aiTaskId: parsed.data.aiTaskId,
        aiPromptVersionId: parsed.data.aiPromptVersionId,
        locale: parsed.data.locale ?? "en",
        inputPayload: parsed.data.inputPayload ?? {},
        aiModelUsed: parsed.data.aiModelUsed,
        jobProfile: {
          ...parsed.data.jobProfile,
          requiredSkills: parsed.data.jobProfile.requiredSkills ?? [],
          preferredSkills: parsed.data.jobProfile.preferredSkills ?? [],
          requiredEducationLevels: parsed.data.jobProfile.requiredEducationLevels ?? [],
          requiredCertifications: parsed.data.jobProfile.requiredCertifications ?? [],
          requiredLanguages: parsed.data.jobProfile.requiredLanguages ?? [],
          workAuthorizationRequired: parsed.data.jobProfile.workAuthorizationRequired ?? false,
        },
        candidateContext: parsed.data.candidateContext ?? {},
        eventRouting: parsed.data.eventRouting,
        metadata: parsed.data.metadata ?? {},
      });

      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  }

  if (segments.length === 2 && segments[1] === "reviews" && request.method === "GET") {
    return NextResponse.json({ success: true, data: await listSmartJobMatchReviews() });
  }

  if (segments.length === 3 && segments[2] === "review" && request.method === "POST") {
    const parsed = await parseJsonBody(request, updateSmartJobMatchReviewSchema);
    if (parsed.error) return parsed.error;

    const data = await updateSmartJobMatchReview({
      matchId: segments[1],
      status: parsed.data.status,
      reviewerStaffId: parsed.data.reviewerStaffId,
      reviewNotes: parsed.data.reviewNotes,
      eventRouting: parsed.data.eventRouting,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data });
  }

  return jsonError("NOT_FOUND", "Smart matching endpoint not found", 404);
}

async function handleEvents(request: Request, segments: string[]) {
  if (segments.length === 2 && segments[1] === "consume" && request.method === "POST") {
    const parsed = await parseJsonBody(request, consumeRecruitmentEventSchema);
    if (parsed.error) return parsed.error;

    const data = await consumeRecruitmentIntelligenceEvent({
      eventId: parsed.data.eventId,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data });
  }

  return jsonError("NOT_FOUND", "Events endpoint not found", 404);
}

async function dispatch(request: Request, segments: string[]) {
  const root = segments[0];
  if (root === "document-analyses") return handleDocumentAnalyses(request);
  if (root === "professional-profiles") return handleProfiles(request, segments);
  if (root === "skill-taxonomy") return handleSkillTaxonomy(request);
  if (root === "skill-aliases") return handleSkillAliases(request);
  if (root === "skill-extractions") return handleSkills(request);
  if (root === "experience-extractions") return handleExperiences(request);
  if (root === "education-extractions") return handleEducations(request);
  if (root === "certification-extractions") return handleCertifications(request);
  if (root === "language-extractions") return handleLanguages(request);
  if (root === "timeline-entries") return handleTimeline(request);
  if (root === "confidence-scores") return handleConfidenceScores(request);
  if (root === "review-status") return handleReviewStatus(request, segments);
  if (root === "recommendations") return handleRecommendations(request);
  if (root === "canonical-profiles") return handleCanonicalProfiles(request);
  if (root === "canonical-fields") return handleCanonicalFields(request);
  if (root === "conflicts") return handleConflicts(request, segments);
  if (root === "review-items") return handleReviewItems(request);
  if (root === "canonical-timeline") return handleCanonicalTimeline(request);
  if (root === "knowledge-graph") return handleKnowledgeGraph(request, segments);
  if (root === "smart-matching") return handleSmartMatching(request, segments);
  if (root === "events") return handleEvents(request, segments);

  return jsonError("NOT_FOUND", "Recruitment intelligence endpoint not found", 404);
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-ai-recruitment-intelligence-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const access = await ensureAccess(request);
  if (access) return access;

  const { path } = await params;
  const segments = path.filter((segment) => segment.length > 0);
  if (segments.length === 0) return jsonError("NOT_FOUND", "Resource path required", 404);

  return dispatch(request, segments);
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-ai-recruitment-intelligence-post", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const access = await ensureAccess(request);
  if (access) return access;

  const { path } = await params;
  const segments = path.filter((segment) => segment.length > 0);
  if (segments.length === 0) return jsonError("NOT_FOUND", "Resource path required", 404);

  return dispatch(request, segments);
}
