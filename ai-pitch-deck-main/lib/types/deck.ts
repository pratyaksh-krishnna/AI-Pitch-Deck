export type DeckStatus = "PENDING" | "GENERATING" | "COMPLETE" | "FAILED";

export type SlideStatus = "PENDING" | "BUILDING" | "SCORING" | "REVISING" | "PASSED" | "FLAGGED" | "FAILED";

export type SlideHistoryEntry = { round: number; score: number | null; feedback: string[] };

export type SlideSummary = {
  id: string;
  order: number;
  sectionId: string;
  sectionLabel: string;
  status: SlideStatus;
  round: number;
  score: number | null;
  headline: string | null;
  history: SlideHistoryEntry[];
};

export type DeckDetail = {
  id: string;
  idea: string;
  title: string | null;
  status: DeckStatus;
  errorMessage: string | null;
  slides: SlideSummary[];
  deckHtml: string | null;
  /** One-slide documents (best version of each Slide) for DeckPlayerFallback; empty until the Deck is COMPLETE. */
  slideHtml: string[];
  createdAt: string;
  updatedAt: string;
};

export type DeckListItem = {
  id: string;
  idea: string;
  title: string | null;
  status: DeckStatus;
  errorMessage: string | null;
  slideCount: number;
  createdAt: string;
  updatedAt: string;
};
