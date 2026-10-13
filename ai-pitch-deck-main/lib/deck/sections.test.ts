import { describe, expect, it } from "vitest";

import { DECK_SECTIONS, sceneIdFor, sectionById } from "@/lib/deck/sections";

describe("DECK_SECTIONS", () => {
  it("is the fixed 7-section investor order", () => {
    expect(DECK_SECTIONS.map((s) => s.id)).toEqual([
      "title", "problem", "solution", "market", "product", "business-model", "ask",
    ]);
  });

  it("looks sections up by id", () => {
    expect(sectionById("ask").label).toBe("The Ask");
  });

  it("builds CSS-safe scene ids that never start with a digit", () => {
    expect(sceneIdFor(6, "business-model")).toBe("s6-business-model");
    expect(sceneIdFor(1, "title")).toMatch(/^[a-z][a-z0-9-]*$/);
  });
});
