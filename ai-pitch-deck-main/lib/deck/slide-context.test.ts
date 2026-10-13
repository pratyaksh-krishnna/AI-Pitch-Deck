import { describe, expect, it } from "vitest";

import { deckFailureMessage, slideContextFor } from "@/lib/deck/slide-context";
import { validTheme } from "@/lib/schemas/fixtures";

const outline = ["title", "problem", "solution", "market", "product", "business-model", "ask"]
  .map((sectionId) => ({ sectionId, keyMessage: `Key ${sectionId} message.` })) as never;

describe("slideContextFor", () => {
  it("builds a validated Slide Builder context from database rows", () => {
    const ctx = slideContextFor(
      { idea: "Rent splitting", title: "RoomiePay", theme: validTheme },
      { order: 2, sectionId: "problem", keyMessage: "Students lose hours." },
      outline,
    );
    expect(ctx).toMatchObject({ order: 2, sectionId: "problem", deckTitle: "RoomiePay", theme: validTheme });
  });

  it("rejects an unknown section or a missing theme", () => {
    expect(() => slideContextFor({ idea: "x", title: "y", theme: null }, { order: 1, sectionId: "title", keyMessage: "k" }, outline)).toThrow();
    expect(() => slideContextFor({ idea: "x", title: "y", theme: validTheme }, { order: 1, sectionId: "team", keyMessage: "k" }, outline)).toThrow();
  });
});

describe("deckFailureMessage", () => {
  it("is null when every slide finished and names the slides that failed otherwise", () => {
    expect(deckFailureMessage([{ status: "fulfilled", value: {} }])).toBeNull();
    expect(deckFailureMessage([
      { status: "fulfilled", value: {} },
      { status: "rejected", reason: new Error("Slide Builder declined this request (cyber).") },
    ])).toBe("1 slide could not be generated: Slide Builder declined this request (cyber).");
  });
});
