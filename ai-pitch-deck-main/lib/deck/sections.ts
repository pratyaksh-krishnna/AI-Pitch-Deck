/** The fixed investor-deck structure. Order here is slide order. */
export const DECK_SECTIONS = [
  { id: "title", label: "Title", guidance: "Company name and a one-line tagline that says what you do and for whom." },
  { id: "problem", label: "Problem", guidance: "The specific, painful problem, quantified for a named customer." },
  { id: "solution", label: "Solution", guidance: "How the product removes that pain, in one sentence plus proof." },
  { id: "market", label: "Market", guidance: "Bottom-up market size: customers × price. Show the math, never a bare TAM." },
  { id: "product", label: "Product", guidance: "The 3–4 capabilities that matter most, tied to the problem." },
  { id: "business-model", label: "Business Model", guidance: "Who pays, how much, how often, and the unit economics." },
  { id: "ask", label: "The Ask", guidance: "Amount raised, what it buys, and the milestone it reaches." },
] as const;

export type SectionId = (typeof DECK_SECTIONS)[number]["id"];
export type DeckSection = (typeof DECK_SECTIONS)[number];

export const SECTION_IDS = DECK_SECTIONS.map((s) => s.id) as [SectionId, ...SectionId[]];

export function sectionById(id: SectionId): DeckSection {
  const section = DECK_SECTIONS.find((s) => s.id === id);
  if (!section) throw new Error(`Unknown section: ${id}`);
  return section;
}

/** Scene id used as data-composition-id and as the CSS/id prefix. */
export function sceneIdFor(order: number, sectionId: SectionId): string {
  return `s${order}-${sectionId}`;
}
