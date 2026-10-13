import type { DeckTheme } from "@/lib/schemas/deck-theme";
import type { SlideDraft } from "@/lib/schemas/slide-draft";

export const validTheme: DeckTheme = {
  background: "#0b1020", surface: "#141a33", text: "#f5f7ff",
  mutedText: "#a8b0d6", accent: "#5b8cff",
  headingFont: "sans", bodyFont: "sans", motion: "calm",
};

export const validDraft: SlideDraft = {
  headline: "Students lose 6 hours a month chasing roommates for money",
  body: ["Rent, groceries and bills split by hand", "Reminders feel awkward"],
  speakerNotes: "Open with the pain.",
  imagePrompt: "Three students around a kitchen table looking at a phone, warm light",
  imageAspect: "landscape",
  markup: '<h1 id="s2-problem-headline">Students lose 6 hours a month</h1><img data-slide-image alt="">',
  css: "#s2-problem-headline { font-size: 88px; }",
  animation: 'tl.from("#s2-problem-headline", { opacity: 0, y: 30, duration: 0.6 }, t0 + 0.2);',
};
