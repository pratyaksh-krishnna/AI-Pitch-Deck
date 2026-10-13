import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { slideStatusLabel } from "@/lib/deck/slide-status-label";
import type { SlideSummary } from "@/lib/types/deck";

const variant = (s: SlideSummary["status"]) =>
  s === "PASSED" ? "outline" : s === "FLAGGED" ? "secondary" : s === "FAILED" ? "destructive" : "default";

const isWorking = (s: SlideSummary["status"]) => s === "BUILDING" || s === "SCORING" || s === "REVISING";

/** One card per Slide: live state while generating, score and Feedback history afterwards. */
export function SlideProgress({ slides }: { slides: SlideSummary[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {slides.map((slide) => (
        <li key={slide.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{slide.order}. {slide.sectionLabel}</p>
            <Badge variant={variant(slide.status)}>
              {isWorking(slide.status) ? <Spinner className="size-3" /> : null}
              {slide.status === "FLAGGED" ? "⚠️ " : null}
              {slideStatusLabel(slide)}
            </Badge>
          </div>
          {slide.headline ? <p className="mt-2 text-sm text-muted-foreground">{slide.headline}</p> : null}
          {slide.history.length > 0 ? (
            <Accordion className="mt-2">
              <AccordionItem value="history">
                <AccordionTrigger className="text-xs">Feedback history ({slide.history.length} version{slide.history.length === 1 ? "" : "s"})</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-xs">
                    {slide.history.map((h) => (
                      <li key={h.round}>
                        <span className="font-medium">Round {h.round}: {h.score === null ? "not scored" : `${h.score}/10`}</span>
                        {h.feedback.length > 0 ? (
                          <ul className="ml-4 list-disc text-muted-foreground">
                            {h.feedback.map((f) => <li key={f}>{f}</li>)}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
