import test from "node:test";
import assert from "node:assert/strict";
import {
  PGPE_USER_FRIENDLY_MESSAGE,
  PGPE_TIMELINE_USER_MESSAGE,
  runPGPEProtectionPipeline,
} from "./index.ts";

test("medium confidence protects automatically and continues workflow", () => {
  const result = runPGPEProtectionPipeline({
    signalType: "email",
    confidenceLevel: "medium",
    confidenceScore: 0.64,
    repeatedConfirmedAttempts: 1,
    providerResult: {
      detector: "email-provider",
      confidence: 0.64,
      reason: "Probable personal email in CV.",
      evidenceReference: null,
      suggestedAction: "mask",
      humanReviewRequired: false,
      falsePositivePossible: true,
    },
  });

  assert.equal(result.protectionResult.protectionAction, "mask");
  assert.equal(result.protectionResult.detector, "email-provider");
  assert.equal(result.protectionResult.reason, "Probable personal email in CV.");
  assert.equal(result.protectionDecision.continueWorkflow, true);
  assert.equal(result.protectionDecision.showFriendlyNotification, false);
  assert.equal(result.protectionDecision.automaticPenalty, "none");
});

test("high confidence applies protection and friendly message", () => {
  const result = runPGPEProtectionPipeline({
    signalType: "phone",
    confidenceLevel: "high",
    confidenceScore: 0.84,
    repeatedConfirmedAttempts: 1,
    providerResult: {
      detector: "phone-provider",
      confidence: 0.84,
      reason: "Phone number present in candidate message.",
      evidenceReference: "evr:phone:1",
      suggestedAction: "mask",
      humanReviewRequired: false,
      falsePositivePossible: true,
    },
  });

  assert.equal(result.protectionResult.protectionAction, "mask");
  assert.equal(result.protectionDecision.showFriendlyNotification, true);
  assert.equal(result.protectionResult.userMessage, PGPE_USER_FRIENDLY_MESSAGE);
  assert.equal(result.protectionDecision.continueWorkflow, true);
});

test("very high confidence with repeated attempts appends evidence and notifies policy", () => {
  const result = runPGPEProtectionPipeline({
    signalType: "url",
    confidenceLevel: "very_high",
    confidenceScore: 0.96,
    repeatedConfirmedAttempts: 3,
    providerResult: {
      detector: "url-provider",
      confidence: 0.96,
      reason: "Repeated external meeting URL sharing.",
      evidenceReference: "evr:url:3",
      suggestedAction: "convert_to_protected_placeholder",
      humanReviewRequired: true,
      falsePositivePossible: false,
    },
  });

  assert.equal(result.protectionDecision.notifyPolicyEngine, true);
  assert.equal(result.protectionDecision.notifyRuleEngine, true);
  assert.equal(result.protectionDecision.appendEvidenceReference, true);
  assert.equal(result.protectionDecision.automaticPenalty, "none");
  assert.equal(result.protectionResult.protectionAction, "convert_to_protected_placeholder");
});

test("pipeline step order keeps continue-workflow path", () => {
  const result = runPGPEProtectionPipeline({
    signalType: "private_attachment",
    confidenceLevel: "medium",
    confidenceScore: 0.67,
    repeatedConfirmedAttempts: 0,
    providerResult: {
      detector: "attachment-provider",
      confidence: 0.67,
      reason: "Attachment contains private candidate fields.",
      evidenceReference: null,
      suggestedAction: "protected_copy",
      humanReviewRequired: false,
      falsePositivePossible: true,
    },
  });

  assert.deepEqual(result.steps, [
    "normalize",
    "inspect",
    "analyze",
    "confidence_scoring",
    "protection_decision",
    "automatic_protection",
    "evidence_reference",
    "continue_workflow",
  ]);
});

test("original object remains private while protected employer copy is created", () => {
  const result = runPGPEProtectionPipeline({
    signalType: "document_text",
    confidenceLevel: "medium",
    confidenceScore: 0.6,
    repeatedConfirmedAttempts: 0,
    providerResult: {
      detector: "document-provider",
      confidence: 0.6,
      reason: "Document text contains personal fields.",
      evidenceReference: "evr:doc:1",
      suggestedAction: "protected_copy",
      humanReviewRequired: false,
      falsePositivePossible: true,
    },
  });

  assert.equal(result.documentModelArchitecture.originalCopy.encrypted, true);
  assert.equal(result.documentModelArchitecture.protectedCopy.usedForRecruitment, true);
  assert.equal(result.documentModelArchitecture.futureAIProfessionalProfile.generatedLater, true);
  assert.equal(result.documentModelArchitecture.futureAIProfessionalProfile.aiNotImplemented, true);
});

test("audit and timeline phrasing focuses on protection, not accusations", () => {
  const result = runPGPEProtectionPipeline({
    signalType: "private_attachment",
    confidenceLevel: "high",
    confidenceScore: 0.9,
    repeatedConfirmedAttempts: 0,
    providerResult: {
      detector: "attachment-provider",
      confidence: 0.9,
      reason: "Private data in attachment.",
      evidenceReference: "evr:attachment:1",
      suggestedAction: "protected_copy",
      humanReviewRequired: false,
      falsePositivePossible: true,
    },
  });

  assert.equal(result.protectionTimelineEvent.userMessage, PGPE_TIMELINE_USER_MESSAGE);
  assert.equal(result.protectionEvents.length, 4);
  assert.equal(result.protectionAuditRecord.detector, "attachment-provider");
  assert.equal(result.protectionAuditRecord.protectionAction, "protected_copy");
});
