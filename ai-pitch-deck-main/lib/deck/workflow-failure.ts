/** Longest error message stored on a Deck or Slide (it is shown in the UI). */
export const MAX_FAILURE_MESSAGE = 500;

/** A readable message for a workflow that failed for good. */
export function failureMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const message = raw.trim() || fallback;
  return message.length > MAX_FAILURE_MESSAGE ? `${message.slice(0, MAX_FAILURE_MESSAGE - 1)}…` : message;
}

/** The update that leaves a Deck or Slide FAILED instead of stuck in a working state. */
export function failedUpdate(error: unknown, fallback: string): { status: "FAILED"; errorMessage: string } {
  return { status: "FAILED", errorMessage: failureMessage(error, fallback) };
}

/** Reads an id from the event that triggered the failed run (Inngest onFailure payload). */
export function idFromFailureEvent(failureEvent: { data: { event?: { data?: unknown } } }, key: "deckId" | "slideId"): string | null {
  const data = failureEvent.data.event?.data;
  if (typeof data !== "object" || data === null) return null;
  const id = (data as Record<string, unknown>)[key];
  return typeof id === "string" && id.length > 0 ? id : null;
}
