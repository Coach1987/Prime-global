export type EmployerTourEvent =
  | "tour_started"
  | "tour_step_viewed"
  | "tour_completed"
  | "tour_skipped"
  | "tour_replayed";

export function emitEmployerTourEvent(event: EmployerTourEvent, detail: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(event, { detail }));
  const analyticsWindow = window as typeof window & { dataLayer?: Array<Record<string, unknown>> };
  analyticsWindow.dataLayer?.push({ event, ...detail });
}
