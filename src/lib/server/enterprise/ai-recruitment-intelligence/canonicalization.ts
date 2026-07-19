import { buildCandidateTimeline } from "./timeline.ts";
import type {
  CandidateCanonicalFieldStatus,
  CandidateCertificationExtractionRecord,
  CandidateEducationExtractionRecord,
  CandidateExperienceExtractionRecord,
  CandidateLanguageExtractionRecord,
  CandidateSkillExtractionRecord,
  CandidateTimelineEntryRecord,
} from "./types.ts";

const LOW_CONFIDENCE_THRESHOLD = 0.55;

type EvidenceItem = {
  originalDocument: string;
  sourcePage: number | string | null;
  extractionMethod: string;
  aiModel: string;
  confidenceScore: number;
  extractionTimestamp: string;
  extractionRecordId: string;
};

type ConsolidatedField = {
  fieldPath: string;
  canonicalValue: unknown;
  fieldStatus: CandidateCanonicalFieldStatus;
  confidenceScore: number;
  evidence: EvidenceItem[];
  sourceCount: number;
  metadata: Record<string, unknown>;
};

type ConsolidatedConflict = {
  fieldPath: string;
  conflictKind: "value_mismatch" | "source_disagreement" | "low_confidence";
  conflictPayload: Record<string, unknown>;
  status: "needs_staff_review";
  metadata: Record<string, unknown>;
};

type ConsolidatedReviewItem = {
  itemType: "conflict" | "low_confidence" | "missing_information";
  severity: "high" | "medium" | "low";
  fieldPath?: string;
  reasonCode: string;
  payload: Record<string, unknown>;
  status: "needs_staff_review";
  metadata: Record<string, unknown>;
};

type GraphNodeDraft = {
  nodeType: "skill" | "experience" | "education" | "certificate" | "language" | "project" | "employer" | "country";
  nodeKey: string;
  nodeLabel: string;
  metadata: Record<string, unknown>;
};

type GraphEdgeDraft = {
  fromNodeKeyRef: string;
  toNodeKeyRef: string;
  relationType: string;
  metadata: Record<string, unknown>;
};

export interface CandidateCanonicalizationResult {
  canonicalPayload: Record<string, unknown>;
  fields: ConsolidatedField[];
  conflicts: ConsolidatedConflict[];
  reviewItems: ConsolidatedReviewItem[];
  timeline: Array<{
    entryType: CandidateTimelineEntryRecord["entry_type"];
    title: string;
    description: string;
    startDate: string | null;
    endDate: string | null;
    sourceEvidence: EvidenceItem[];
    metadata: Record<string, unknown>;
  }>;
  graph: {
    nodes: GraphNodeDraft[];
    edges: GraphEdgeDraft[];
  };
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extractSourcePage(metadata: Record<string, unknown>): number | string | null {
  const page = metadata.sourcePage;
  if (typeof page === "number" || typeof page === "string") return page;
  return null;
}

function toEvidence(input: {
  id: string;
  confidence_score: number;
  extraction_source: string;
  document_reference: string;
  ai_model_used: string;
  extraction_timestamp: string;
  metadata: Record<string, unknown>;
}): EvidenceItem {
  return {
    originalDocument: input.document_reference,
    sourcePage: extractSourcePage(input.metadata),
    extractionMethod: input.extraction_source,
    aiModel: input.ai_model_used,
    confidenceScore: input.confidence_score,
    extractionTimestamp: input.extraction_timestamp,
    extractionRecordId: input.id,
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueValues(values: unknown[]) {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const value of values) {
    const key = JSON.stringify(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function selectValueOrConflict(input: {
  fieldPath: string;
  values: unknown[];
  evidences: EvidenceItem[];
  confidences: number[];
}): {
  value: unknown;
  confidence: number;
  status: CandidateCanonicalFieldStatus;
  conflicts: ConsolidatedConflict[];
  reviewItems: ConsolidatedReviewItem[];
} {
  const confidence = average(input.confidences);
  const unique = uniqueValues(input.values);

  if (unique.length === 0) {
    return {
      value: null,
      confidence,
      status: "missing",
      conflicts: [],
      reviewItems: [
        {
          itemType: "missing_information",
          severity: "medium",
          fieldPath: input.fieldPath,
          reasonCode: "missing_field_value",
          payload: {},
          status: "needs_staff_review",
          metadata: {},
        },
      ],
    };
  }

  if (unique.length > 1) {
    return {
      value: null,
      confidence,
      status: "conflict",
      conflicts: [
        {
          fieldPath: input.fieldPath,
          conflictKind: "value_mismatch",
          conflictPayload: {
            candidates: unique,
            evidence: input.evidences,
          },
          status: "needs_staff_review",
          metadata: {},
        },
      ],
      reviewItems: [
        {
          itemType: "conflict",
          severity: "high",
          fieldPath: input.fieldPath,
          reasonCode: "conflicting_values_detected",
          payload: {
            candidates: unique,
          },
          status: "needs_staff_review",
          metadata: {},
        },
      ],
    };
  }

  if (confidence < LOW_CONFIDENCE_THRESHOLD) {
    return {
      value: unique[0],
      confidence,
      status: "low_confidence",
      conflicts: [
        {
          fieldPath: input.fieldPath,
          conflictKind: "low_confidence",
          conflictPayload: {
            candidate: unique[0],
            confidence,
            threshold: LOW_CONFIDENCE_THRESHOLD,
            evidence: input.evidences,
          },
          status: "needs_staff_review",
          metadata: {},
        },
      ],
      reviewItems: [
        {
          itemType: "low_confidence",
          severity: "medium",
          fieldPath: input.fieldPath,
          reasonCode: "low_confidence_extraction",
          payload: {
            confidence,
            threshold: LOW_CONFIDENCE_THRESHOLD,
          },
          status: "needs_staff_review",
          metadata: {},
        },
      ],
    };
  }

  return {
    value: unique[0],
    confidence,
    status: "verified",
    conflicts: [],
    reviewItems: [],
  };
}

function dedupeEvidence(evidences: EvidenceItem[]) {
  const seen = new Set<string>();
  const out: EvidenceItem[] = [];
  for (const item of evidences) {
    const key = `${item.extractionRecordId}:${item.originalDocument}:${item.extractionTimestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function consolidateCandidateProfile(input: {
  profileDraft: { headline?: string; summary: string };
  skills: CandidateSkillExtractionRecord[];
  experiences: CandidateExperienceExtractionRecord[];
  educations: CandidateEducationExtractionRecord[];
  certifications: CandidateCertificationExtractionRecord[];
  languages: CandidateLanguageExtractionRecord[];
}): CandidateCanonicalizationResult {
  const fields: ConsolidatedField[] = [];
  const conflicts: ConsolidatedConflict[] = [];
  const reviewItems: ConsolidatedReviewItem[] = [];

  const graphNodes = new Map<string, GraphNodeDraft>();
  const graphEdges = new Map<string, GraphEdgeDraft>();

  const upsertNode = (node: GraphNodeDraft) => {
    const key = `${node.nodeType}:${node.nodeKey}`;
    if (!graphNodes.has(key)) graphNodes.set(key, node);
    return key;
  };

  const upsertEdge = (edge: GraphEdgeDraft) => {
    const key = `${edge.fromNodeKeyRef}:${edge.relationType}:${edge.toNodeKeyRef}`;
    if (!graphEdges.has(key)) graphEdges.set(key, edge);
  };

  const profileHeadline = selectValueOrConflict({
    fieldPath: "headline",
    values: input.profileDraft.headline ? [input.profileDraft.headline] : [],
    evidences: [],
    confidences: input.profileDraft.headline ? [1] : [],
  });
  fields.push({
    fieldPath: "headline",
    canonicalValue: profileHeadline.value,
    fieldStatus: profileHeadline.status,
    confidenceScore: profileHeadline.confidence,
    evidence: [],
    sourceCount: input.profileDraft.headline ? 1 : 0,
    metadata: {},
  });
  conflicts.push(...profileHeadline.conflicts);
  reviewItems.push(...profileHeadline.reviewItems);

  fields.push({
    fieldPath: "summary",
    canonicalValue: input.profileDraft.summary,
    fieldStatus: input.profileDraft.summary.trim().length > 0 ? "verified" : "missing",
    confidenceScore: input.profileDraft.summary.trim().length > 0 ? 1 : 0,
    evidence: [],
    sourceCount: input.profileDraft.summary.trim().length > 0 ? 1 : 0,
    metadata: {},
  });
  if (input.profileDraft.summary.trim().length === 0) {
    reviewItems.push({
      itemType: "missing_information",
      severity: "low",
      fieldPath: "summary",
      reasonCode: "missing_summary",
      payload: {},
      status: "needs_staff_review",
      metadata: {},
    });
  }

  const skillGroups = new Map<string, CandidateSkillExtractionRecord[]>();
  for (const row of input.skills) {
    const key = normalizeKey(row.normalized_skill_name || row.raw_skill);
    const list = skillGroups.get(key) ?? [];
    list.push(row);
    skillGroups.set(key, list);
  }

  const canonicalSkills = Array.from(skillGroups.entries()).map(([key, rows]) => {
    const evidences = dedupeEvidence(rows.map((row) => toEvidence(row)));
    const name = rows[0]?.normalized_skill_name ?? rows[0]?.raw_skill ?? key;
    const proficiencySelection = selectValueOrConflict({
      fieldPath: `skills.${key}.proficiencyLevel`,
      values: rows.map((row) => row.proficiency_level),
      evidences,
      confidences: rows.map((row) => row.confidence_score),
    });
    conflicts.push(...proficiencySelection.conflicts);
    reviewItems.push(...proficiencySelection.reviewItems);

    const skillNodeRef = upsertNode({
      nodeType: "skill",
      nodeKey: key,
      nodeLabel: name,
      metadata: {},
    });

    return {
      skill: name,
      taxonomyId: rows[0]?.normalized_taxonomy_id ?? null,
      proficiencyLevel: proficiencySelection.value,
      confidenceScore: average(rows.map((row) => row.confidence_score)),
      evidence: evidences,
      _nodeRef: skillNodeRef,
    };
  });

  const skillFieldStatus: CandidateCanonicalFieldStatus =
    canonicalSkills.length === 0
      ? "missing"
      : canonicalSkills.some((item) => item.proficiencyLevel === null)
        ? "conflict"
        : canonicalSkills.some((item) => item.confidenceScore < LOW_CONFIDENCE_THRESHOLD)
          ? "low_confidence"
          : "verified";

  fields.push({
    fieldPath: "skills",
    canonicalValue: canonicalSkills.map((item) => ({
      skill: item.skill,
      taxonomyId: item.taxonomyId,
      proficiencyLevel: item.proficiencyLevel,
      confidenceScore: item.confidenceScore,
      evidence: item.evidence,
    })),
    fieldStatus: skillFieldStatus,
    confidenceScore: average(canonicalSkills.map((item) => item.confidenceScore)),
    evidence: dedupeEvidence(canonicalSkills.flatMap((item) => item.evidence)),
    sourceCount: canonicalSkills.length,
    metadata: {},
  });

  if (canonicalSkills.length === 0) {
    reviewItems.push({
      itemType: "missing_information",
      severity: "medium",
      fieldPath: "skills",
      reasonCode: "no_skill_extractions",
      payload: {},
      status: "needs_staff_review",
      metadata: {},
    });
  }

  const experienceGroups = new Map<string, CandidateExperienceExtractionRecord[]>();
  for (const row of input.experiences) {
    const key = `${normalizeKey(row.role_title)}|${normalizeKey(row.organization_name)}`;
    const list = experienceGroups.get(key) ?? [];
    list.push(row);
    experienceGroups.set(key, list);
  }

  const canonicalExperiences = Array.from(experienceGroups.entries()).map(([key, rows]) => {
    const evidences = dedupeEvidence(rows.map((row) => toEvidence(row)));
    const startDateSelection = selectValueOrConflict({
      fieldPath: `experiences.${key}.startDate`,
      values: rows.map((row) => row.start_date).filter((value) => value),
      evidences,
      confidences: rows.map((row) => row.confidence_score),
    });
    const endDateSelection = selectValueOrConflict({
      fieldPath: `experiences.${key}.endDate`,
      values: rows.map((row) => row.end_date).filter((value) => value),
      evidences,
      confidences: rows.map((row) => row.confidence_score),
    });

    conflicts.push(...startDateSelection.conflicts, ...endDateSelection.conflicts);
    reviewItems.push(...startDateSelection.reviewItems, ...endDateSelection.reviewItems);

    const title = `${rows[0]?.role_title ?? "Unknown Role"} @ ${rows[0]?.organization_name ?? "Unknown Employer"}`;
    const experienceNodeRef = upsertNode({
      nodeType: "experience",
      nodeKey: key,
      nodeLabel: title,
      metadata: {},
    });

    const employerKey = normalizeKey(rows[0]?.organization_name ?? "unknown_employer");
    const employerNodeRef = upsertNode({
      nodeType: "employer",
      nodeKey: employerKey,
      nodeLabel: rows[0]?.organization_name ?? "Unknown Employer",
      metadata: {},
    });
    upsertEdge({
      fromNodeKeyRef: experienceNodeRef,
      toNodeKeyRef: employerNodeRef,
      relationType: "experience_at_employer",
      metadata: {},
    });

    for (const skill of canonicalSkills) {
      upsertEdge({
        fromNodeKeyRef: experienceNodeRef,
        toNodeKeyRef: skill._nodeRef,
        relationType: "experience_infers_skill",
        metadata: {},
      });
    }

    return {
      roleTitle: rows[0]?.role_title ?? "",
      organizationName: rows[0]?.organization_name ?? "",
      startDate: startDateSelection.value as string | null,
      endDate: endDateSelection.value as string | null,
      isCurrent: rows.some((row) => row.is_current),
      description: rows[0]?.description ?? "",
      confidenceScore: average(rows.map((row) => row.confidence_score)),
      evidence: evidences,
      _nodeRef: experienceNodeRef,
      _conflict: startDateSelection.status === "conflict" || endDateSelection.status === "conflict",
    };
  });

  fields.push({
    fieldPath: "experiences",
    canonicalValue: canonicalExperiences.map((item) => ({
      roleTitle: item.roleTitle,
      organizationName: item.organizationName,
      startDate: item.startDate,
      endDate: item.endDate,
      isCurrent: item.isCurrent,
      description: item.description,
      confidenceScore: item.confidenceScore,
      evidence: item.evidence,
    })),
    fieldStatus:
      canonicalExperiences.length === 0
        ? "missing"
        : canonicalExperiences.some((item) => item._conflict)
          ? "conflict"
          : canonicalExperiences.some((item) => item.confidenceScore < LOW_CONFIDENCE_THRESHOLD)
            ? "low_confidence"
            : "verified",
    confidenceScore: average(canonicalExperiences.map((item) => item.confidenceScore)),
    evidence: dedupeEvidence(canonicalExperiences.flatMap((item) => item.evidence)),
    sourceCount: canonicalExperiences.length,
    metadata: {},
  });

  const educationGroups = new Map<string, CandidateEducationExtractionRecord[]>();
  for (const row of input.educations) {
    const key = `${normalizeKey(row.institution_name)}|${normalizeKey(row.degree_title)}`;
    const list = educationGroups.get(key) ?? [];
    list.push(row);
    educationGroups.set(key, list);
  }

  const canonicalEducations = Array.from(educationGroups.entries()).map(([key, rows]) => {
    const evidences = dedupeEvidence(rows.map((row) => toEvidence(row)));
    const endDateSelection = selectValueOrConflict({
      fieldPath: `educations.${key}.endDate`,
      values: rows.map((row) => row.end_date).filter((value) => value),
      evidences,
      confidences: rows.map((row) => row.confidence_score),
    });
    conflicts.push(...endDateSelection.conflicts);
    reviewItems.push(...endDateSelection.reviewItems);

    const educationNodeRef = upsertNode({
      nodeType: "education",
      nodeKey: key,
      nodeLabel: `${rows[0]?.degree_title ?? ""} @ ${rows[0]?.institution_name ?? ""}`,
      metadata: {},
    });

    return {
      institutionName: rows[0]?.institution_name ?? "",
      degreeTitle: rows[0]?.degree_title ?? "",
      fieldOfStudy: rows[0]?.field_of_study ?? null,
      startDate: rows[0]?.start_date ?? null,
      endDate: endDateSelection.value as string | null,
      grade: rows[0]?.grade ?? null,
      confidenceScore: average(rows.map((row) => row.confidence_score)),
      evidence: evidences,
      _nodeRef: educationNodeRef,
      _conflict: endDateSelection.status === "conflict",
    };
  });

  fields.push({
    fieldPath: "educations",
    canonicalValue: canonicalEducations.map((item) => ({
      institutionName: item.institutionName,
      degreeTitle: item.degreeTitle,
      fieldOfStudy: item.fieldOfStudy,
      startDate: item.startDate,
      endDate: item.endDate,
      grade: item.grade,
      confidenceScore: item.confidenceScore,
      evidence: item.evidence,
    })),
    fieldStatus:
      canonicalEducations.length === 0
        ? "missing"
        : canonicalEducations.some((item) => item._conflict)
          ? "conflict"
          : canonicalEducations.some((item) => item.confidenceScore < LOW_CONFIDENCE_THRESHOLD)
            ? "low_confidence"
            : "verified",
    confidenceScore: average(canonicalEducations.map((item) => item.confidenceScore)),
    evidence: dedupeEvidence(canonicalEducations.flatMap((item) => item.evidence)),
    sourceCount: canonicalEducations.length,
    metadata: {},
  });

  const certificationGroups = new Map<string, CandidateCertificationExtractionRecord[]>();
  for (const row of input.certifications) {
    const key = `${normalizeKey(row.certification_name)}|${normalizeKey(row.credential_id ?? "")}`;
    const list = certificationGroups.get(key) ?? [];
    list.push(row);
    certificationGroups.set(key, list);
  }

  const canonicalCertifications = Array.from(certificationGroups.entries()).map(([key, rows]) => {
    const evidences = dedupeEvidence(rows.map((row) => toEvidence(row)));
    const credentialSelection = selectValueOrConflict({
      fieldPath: `certifications.${key}.credentialId`,
      values: rows.map((row) => row.credential_id).filter((value) => value),
      evidences,
      confidences: rows.map((row) => row.confidence_score),
    });
    conflicts.push(...credentialSelection.conflicts);
    reviewItems.push(...credentialSelection.reviewItems);

    const certificationNodeRef = upsertNode({
      nodeType: "certificate",
      nodeKey: key,
      nodeLabel: rows[0]?.certification_name ?? "",
      metadata: {},
    });

    return {
      certificationName: rows[0]?.certification_name ?? "",
      issuingOrganization: rows[0]?.issuing_organization ?? null,
      issueDate: rows[0]?.issue_date ?? null,
      expiryDate: rows[0]?.expiry_date ?? null,
      credentialId: credentialSelection.value as string | null,
      confidenceScore: average(rows.map((row) => row.confidence_score)),
      evidence: evidences,
      _nodeRef: certificationNodeRef,
      _conflict: credentialSelection.status === "conflict",
    };
  });

  fields.push({
    fieldPath: "certifications",
    canonicalValue: canonicalCertifications.map((item) => ({
      certificationName: item.certificationName,
      issuingOrganization: item.issuingOrganization,
      issueDate: item.issueDate,
      expiryDate: item.expiryDate,
      credentialId: item.credentialId,
      confidenceScore: item.confidenceScore,
      evidence: item.evidence,
    })),
    fieldStatus:
      canonicalCertifications.length === 0
        ? "missing"
        : canonicalCertifications.some((item) => item._conflict)
          ? "conflict"
          : canonicalCertifications.some((item) => item.confidenceScore < LOW_CONFIDENCE_THRESHOLD)
            ? "low_confidence"
            : "verified",
    confidenceScore: average(canonicalCertifications.map((item) => item.confidenceScore)),
    evidence: dedupeEvidence(canonicalCertifications.flatMap((item) => item.evidence)),
    sourceCount: canonicalCertifications.length,
    metadata: {},
  });

  const languageGroups = new Map<string, CandidateLanguageExtractionRecord[]>();
  for (const row of input.languages) {
    const key = normalizeKey(row.normalized_code ?? row.language_name);
    const list = languageGroups.get(key) ?? [];
    list.push(row);
    languageGroups.set(key, list);
  }

  const canonicalLanguages = Array.from(languageGroups.entries()).map(([key, rows]) => {
    const evidences = dedupeEvidence(rows.map((row) => toEvidence(row)));
    const proficiencySelection = selectValueOrConflict({
      fieldPath: `languages.${key}.proficiencyLevel`,
      values: rows.map((row) => row.proficiency_level),
      evidences,
      confidences: rows.map((row) => row.confidence_score),
    });
    conflicts.push(...proficiencySelection.conflicts);
    reviewItems.push(...proficiencySelection.reviewItems);

    const languageNodeRef = upsertNode({
      nodeType: "language",
      nodeKey: key,
      nodeLabel: rows[0]?.language_name ?? key,
      metadata: {},
    });

    return {
      languageName: rows[0]?.language_name ?? "",
      normalizedCode: rows[0]?.normalized_code ?? null,
      proficiencyLevel: proficiencySelection.value,
      confidenceScore: average(rows.map((row) => row.confidence_score)),
      evidence: evidences,
      _nodeRef: languageNodeRef,
    };
  });

  fields.push({
    fieldPath: "languages",
    canonicalValue: canonicalLanguages.map((item) => ({
      languageName: item.languageName,
      normalizedCode: item.normalizedCode,
      proficiencyLevel: item.proficiencyLevel,
      confidenceScore: item.confidenceScore,
      evidence: item.evidence,
    })),
    fieldStatus:
      canonicalLanguages.length === 0
        ? "missing"
        : canonicalLanguages.some((item) => item.proficiencyLevel === null)
          ? "conflict"
          : canonicalLanguages.some((item) => item.confidenceScore < LOW_CONFIDENCE_THRESHOLD)
            ? "low_confidence"
            : "verified",
    confidenceScore: average(canonicalLanguages.map((item) => item.confidenceScore)),
    evidence: dedupeEvidence(canonicalLanguages.flatMap((item) => item.evidence)),
    sourceCount: canonicalLanguages.length,
    metadata: {},
  });

  fields.push({
    fieldPath: "projects",
    canonicalValue: [],
    fieldStatus: "missing",
    confidenceScore: 0,
    evidence: [],
    sourceCount: 0,
    metadata: {
      reason: "no_project_extraction_pipeline_in_phase7",
    },
  });
  reviewItems.push({
    itemType: "missing_information",
    severity: "low",
    fieldPath: "projects",
    reasonCode: "project_data_not_available",
    payload: {},
    status: "needs_staff_review",
    metadata: {},
  });

  fields.push({
    fieldPath: "countries",
    canonicalValue: [],
    fieldStatus: "missing",
    confidenceScore: 0,
    evidence: [],
    sourceCount: 0,
    metadata: {
      reason: "country_not_explicitly_extracted_in_phase7",
    },
  });
  reviewItems.push({
    itemType: "missing_information",
    severity: "low",
    fieldPath: "countries",
    reasonCode: "country_data_not_available",
    payload: {},
    status: "needs_staff_review",
    metadata: {},
  });

  const timeline = buildCandidateTimeline([
    ...canonicalExperiences
      .filter((row) => !row._conflict)
      .map((row) => ({
        entryType: "experience" as const,
        title: `${row.roleTitle} @ ${row.organizationName}`,
        description: row.description,
        startDate: row.startDate,
        endDate: row.endDate,
        metadata: {},
      })),
    ...canonicalEducations
      .filter((row) => !row._conflict)
      .map((row) => ({
        entryType: "education" as const,
        title: `${row.degreeTitle} @ ${row.institutionName}`,
        description: row.fieldOfStudy ?? "",
        startDate: row.startDate,
        endDate: row.endDate,
        metadata: {},
      })),
    ...canonicalCertifications
      .filter((row) => !row._conflict)
      .map((row) => ({
        entryType: "certification" as const,
        title: row.certificationName,
        description: row.issuingOrganization ?? "",
        startDate: row.issueDate,
        endDate: row.expiryDate,
        metadata: {},
      })),
    ...canonicalLanguages.map((row) => ({
      entryType: "language" as const,
      title: row.languageName,
      description: String(row.proficiencyLevel ?? "unknown"),
      metadata: {},
    })),
    ...canonicalSkills.map((row) => ({
      entryType: "skill" as const,
      title: row.skill,
      description: String(row.proficiencyLevel ?? "unknown"),
      metadata: {},
    })),
  ]).map((entry) => ({
    entryType: entry.entryType,
    title: entry.title,
    description: entry.description,
    startDate: entry.startDate,
    endDate: entry.endDate,
    sourceEvidence: [],
    metadata: entry.metadata,
  }));

  const canonicalPayload = {
    headline: profileHeadline.value,
    summary: input.profileDraft.summary,
    skills: canonicalSkills.map((item) => ({
      skill: item.skill,
      taxonomyId: item.taxonomyId,
      proficiencyLevel: item.proficiencyLevel,
      confidenceScore: item.confidenceScore,
      evidence: item.evidence,
    })),
    experiences: canonicalExperiences.map((item) => ({
      roleTitle: item.roleTitle,
      organizationName: item.organizationName,
      startDate: item.startDate,
      endDate: item.endDate,
      isCurrent: item.isCurrent,
      description: item.description,
      confidenceScore: item.confidenceScore,
      evidence: item.evidence,
    })),
    educations: canonicalEducations.map((item) => ({
      institutionName: item.institutionName,
      degreeTitle: item.degreeTitle,
      fieldOfStudy: item.fieldOfStudy,
      startDate: item.startDate,
      endDate: item.endDate,
      grade: item.grade,
      confidenceScore: item.confidenceScore,
      evidence: item.evidence,
    })),
    certifications: canonicalCertifications.map((item) => ({
      certificationName: item.certificationName,
      issuingOrganization: item.issuingOrganization,
      issueDate: item.issueDate,
      expiryDate: item.expiryDate,
      credentialId: item.credentialId,
      confidenceScore: item.confidenceScore,
      evidence: item.evidence,
    })),
    languages: canonicalLanguages.map((item) => ({
      languageName: item.languageName,
      normalizedCode: item.normalizedCode,
      proficiencyLevel: item.proficiencyLevel,
      confidenceScore: item.confidenceScore,
      evidence: item.evidence,
    })),
  } satisfies Record<string, unknown>;

  return {
    canonicalPayload,
    fields,
    conflicts,
    reviewItems,
    timeline,
    graph: {
      nodes: Array.from(graphNodes.values()),
      edges: Array.from(graphEdges.values()),
    },
  };
}
