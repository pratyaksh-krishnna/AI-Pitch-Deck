import { REVISION_LIMIT } from "@/lib/quality/rules";
import type { SlideSummary } from "@/lib/types/deck";

export function slideStatusLabel(slide: Pick<SlideSummary, "status" | "round" | "score">): string {
  switch (slide.status) {
    case "PENDING": return "Waiting";
    case "BUILDING": return "Building";
    case "SCORING": return "Scoring";
    case "REVISING": return `Revising — round ${slide.round} of ${REVISION_LIMIT}`;
    case "PASSED": return `Passed — ${slide.score}/10`;
    case "FLAGGED": return slide.score === null ? "Flagged" : `Flagged — best ${slide.score}/10`;
    case "FAILED": return "Failed";
  }
}
