import { describe, expect, it } from "vitest";

import { SECTION_IDS } from "@/lib/deck/sections";
import { StoredOutlineSchema } from "@/lib/schemas/deck-plan";

const entries = SECTION_IDS.map((sectionId) => ({ sectionId, keyMessage: "A key message for this slide." }));

describe("StoredOutlineSchema", () => {
  it("accepts the full outline", () => {
    expect(StoredOutlineSchema.parse(entries)).toHaveLength(SECTION_IDS.length);
  });

  it("accepts a truncated prefix (DECK_SLIDE_LIMIT)", () => {
    expect(StoredOutlineSchema.parse(entries.slice(0, 2))).toHaveLength(2);
  });

  it("rejects out-of-order and non-prefix outlines", () => {
    expect(() => StoredOutlineSchema.parse([entries[1], entries[0]])).toThrow();
    expect(() => StoredOutlineSchema.parse(entries.slice(1, 3))).toThrow();
  });

  it("rejects an empty outline", () => {
    expect(() => StoredOutlineSchema.parse([])).toThrow();
  });
});
