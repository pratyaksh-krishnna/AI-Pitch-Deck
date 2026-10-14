import { describe, expect, it } from "vitest";

import { failedUpdate, failureMessage, idFromFailureEvent, MAX_FAILURE_MESSAGE } from "@/lib/deck/workflow-failure";

describe("failureMessage", () => {
  it("uses the error's message", () => {
    expect(failureMessage(new Error("Slide Builder declined this request (cyber)."), "fallback"))
      .toBe("Slide Builder declined this request (cyber).");
  });

  it("falls back for empty messages and non-Error values", () => {
    expect(failureMessage(new Error("   "), "Could not generate this deck.")).toBe("Could not generate this deck.");
    expect(failureMessage(undefined, "Could not generate this deck.")).toBe("Could not generate this deck.");
    expect(failureMessage("boom", "fallback")).toBe("boom");
  });

  it("caps very long messages", () => {
    const message = failureMessage(new Error("x".repeat(5000)), "fallback");
    expect(message.length).toBe(MAX_FAILURE_MESSAGE);
    expect(message.endsWith("…")).toBe(true);
  });
});

describe("failedUpdate", () => {
  it("marks the record FAILED with a readable message", () => {
    expect(failedUpdate(new Error("ImageKit upload did not return a URL"), "fallback"))
      .toEqual({ status: "FAILED", errorMessage: "ImageKit upload did not return a URL" });
  });
});

describe("idFromFailureEvent", () => {
  it("reads the id from the event that triggered the failed run", () => {
    const event = { data: { event: { name: "slide/generate", data: { slideId: "sl_1" } } } };
    expect(idFromFailureEvent(event, "slideId")).toBe("sl_1");
  });

  it("returns null when the id is missing or not a string", () => {
    expect(idFromFailureEvent({ data: { event: { data: {} } } }, "deckId")).toBeNull();
    expect(idFromFailureEvent({ data: { event: { data: { deckId: 42 } } } }, "deckId")).toBeNull();
    expect(idFromFailureEvent({ data: {} }, "deckId")).toBeNull();
  });
});
