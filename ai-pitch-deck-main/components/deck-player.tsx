"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SLIDE_PLAYER_RANGE } from "@/lib/hyperframes/assemble-deck";

/**
 * Plays a Deck one Slide at a time. Each Slide is its own one-slide HyperFrames
 * document, shown in an opaque-origin sandbox so AI-written HTML/JS cannot reach
 * this page. Each Slide plays its entrance from 0 and parks on its rest frame
 * (range-end holds the last frame before REST_OFFSET_SECONDS).
 *
 * Fallback for <hyperframes-slideshow>: without the HyperFrames engine, the bare
 * player resolves only the first top-level scene of a multi-scene document, so
 * the slideshow cannot navigate an assembled deck.
 */
export function DeckPlayerFallback({ slides }: { slides: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    void import("@hyperframes/player");
  }, []);

  if (slides.length === 0) return null;

  return (
    <div className="space-y-3">
      <hyperframes-player
        key={index}
        sandbox-origin="opaque"
        srcdoc={slides[index]}
        range-start={String(SLIDE_PLAYER_RANGE.start)}
        range-end={String(SLIDE_PLAYER_RANGE.end)}
        autoplay
        style={{ width: "100%", aspectRatio: "16 / 9", display: "block" }}
      />
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          {index + 1} / {slides.length}
        </span>
        <Button variant="outline" disabled={index === slides.length - 1} onClick={() => setIndex(index + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
