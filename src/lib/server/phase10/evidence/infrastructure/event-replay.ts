import { isPhase10FeatureEnabled } from "../../feature-flags/index.ts";
import { applyReplayCompatibility } from "./compatibility.ts";
import { toVersionedEvidenceEnvelope } from "./versioning.ts";
import type {
  Phase10EvidenceReplayDependencies,
  Phase10EvidenceReplayEvent,
  Phase10EvidenceReplayInput,
  Phase10EvidenceReplayResult,
} from "./types.ts";

function findStartIndex(events: Phase10EvidenceReplayEvent[], cursorEventId: string | null): number {
  if (!cursorEventId) {
    return 0;
  }

  const index = events.findIndex((entry) => entry.event.id === cursorEventId);
  return index < 0 ? 0 : index + 1;
}

export async function replayEvidenceCase(
  dependencies: Phase10EvidenceReplayDependencies,
  input: Phase10EvidenceReplayInput
): Promise<Phase10EvidenceReplayResult> {
  if (!isPhase10FeatureEnabled("SHIELD_INFRA_FOUNDATION_ENABLED") || !isPhase10FeatureEnabled("SHIELD_EVENT_REPLAY_ENABLED")) {
    return {
      enabled: false,
      status: "skipped",
      processedCount: 0,
      nextCursor: input.cursor ?? null,
      events: [],
    };
  }

  const evidenceEvents = await dependencies.repository.findEvidenceEventsByCaseId(input.evidenceCaseId);
  const normalized = applyReplayCompatibility(
    evidenceEvents.map((event) => ({
      event,
      envelope: toVersionedEvidenceEnvelope(event),
    }))
  );

  const startIndex = findStartIndex(normalized, input.cursor?.eventId ?? null);
  const maxEvents = input.maxEvents && input.maxEvents > 0 ? input.maxEvents : normalized.length;
  const replayed = normalized.slice(startIndex, startIndex + maxEvents);

  const lastEvent = replayed[replayed.length - 1]?.event ?? null;

  return {
    enabled: true,
    status: "completed",
    processedCount: replayed.length,
    nextCursor: lastEvent
      ? {
          evidenceCaseId: input.evidenceCaseId,
          eventId: lastEvent.id,
          position: startIndex + replayed.length,
        }
      : input.cursor ?? {
          evidenceCaseId: input.evidenceCaseId,
          eventId: null,
          position: startIndex,
        },
    events: replayed,
  };
}
