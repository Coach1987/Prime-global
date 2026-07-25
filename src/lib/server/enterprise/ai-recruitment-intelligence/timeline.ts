import type { CandidateTimelineBuildInput, CandidateTimelineBuildResult } from "./types.ts";

function toSortableDate(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  return new Date(value).getTime();
}

export function buildCandidateTimeline(entries: CandidateTimelineBuildInput[]): CandidateTimelineBuildResult[] {
  return entries
    .map((entry) => ({
      entryType: entry.entryType,
      title: entry.title,
      description: entry.description,
      startDate: entry.startDate ?? null,
      endDate: entry.endDate ?? null,
      metadata: entry.metadata ?? {},
    }))
    .sort((a, b) => {
      const startDelta = toSortableDate(a.startDate) - toSortableDate(b.startDate);
      if (startDelta !== 0) return startDelta;
      return toSortableDate(a.endDate) - toSortableDate(b.endDate);
    });
}
