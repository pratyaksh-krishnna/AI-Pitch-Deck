"use client";

import { useCallback, useEffect, useState } from "react";

import { DeckPlayerFallback } from "@/components/deck-player";
import { DeckStatusBadge } from "@/components/deck-status-badge";
import { SlideProgress } from "@/components/slide-progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import type { DeckDetail } from "@/lib/types/deck";

const POLL_INTERVAL_MS = 3000;

function isGenerating(status: DeckDetail["status"]) {
  return status === "PENDING" || status === "GENERATING";
}

export function DeckViewer({ deckId }: { deckId: string }) {
  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchDeck = useCallback(async () => {
    const response = await fetch(`/api/decks/${deckId}`);

    if (!response.ok) {
      throw new Error("Deck not found");
    }

    return response.json() as Promise<DeckDetail>;
  }, [deckId]);

  // Initial load
  useEffect(() => {
    fetchDeck()
      .then(setDeck)
      .catch(() => setLoadError("Could not load this deck."));
  }, [fetchDeck]);

  // Poll while generating
  useEffect(() => {
    if (!deck || !isGenerating(deck.status)) {
      return;
    }

    const interval = setInterval(() => {
      fetchDeck()
        .then(setDeck)
        .catch(() => setLoadError("Could not refresh deck status."));
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [deck, fetchDeck]);

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  if (!deck) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Spinner className="size-5" />
        <span>Loading deck…</span>
      </div>
    );
  }

  const displayTitle = deck.title ?? "Untitled Pitch Deck";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {displayTitle}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{deck.idea}</p>
        </div>
        <DeckStatusBadge status={deck.status} />
      </div>

      {isGenerating(deck.status) ? (
        <p className="text-sm text-muted-foreground">
          Each slide is built, scored and revised until it reaches 8/10 (up to 3 rounds). This page refreshes every few seconds.
        </p>
      ) : null}

      {deck.status === "FAILED" ? (
        <Alert variant="destructive">
          <AlertTitle>Generation failed</AlertTitle>
          <AlertDescription>
            {deck.errorMessage ?? "Something went wrong while generating this deck."}
          </AlertDescription>
        </Alert>
      ) : null}

      {deck.status === "COMPLETE" && deck.slideHtml.length > 0 ? <DeckPlayerFallback slides={deck.slideHtml} /> : null}

      {deck.slides.length > 0 ? <SlideProgress slides={deck.slides} /> : null}
    </div>
  );
}
