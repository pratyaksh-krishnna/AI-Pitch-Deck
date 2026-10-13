import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #1a2b3c");

/** Generic stacks only — HyperFrames lint requires @font-face for named fonts. */
export const FONT_STACKS = {
  sans: "system-ui, sans-serif",
  serif: "ui-serif, serif",
  mono: "ui-monospace, monospace",
} as const;
export type FontStack = keyof typeof FONT_STACKS;
const fontStack = z.enum(["sans", "serif", "mono"]);

export const DeckThemeSchema = z.object({
  background: hex,
  surface: hex,
  text: hex,
  mutedText: hex,
  accent: hex,
  headingFont: fontStack,
  bodyFont: fontStack,
  motion: z.enum(["calm", "energetic"]),
});

export type DeckTheme = z.infer<typeof DeckThemeSchema>;
