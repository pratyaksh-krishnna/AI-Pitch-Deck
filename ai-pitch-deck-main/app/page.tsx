import { CreateDeckForm } from "@/components/create-deck-form";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12">
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Turn your idea into a pitch deck
          </h1>
          <p className="text-muted-foreground">
            Describe your startup or project idea. A Claude Slide Builder designs
            animated slides, an Image Agent illustrates them, and a Feedback Agent
            scores each slide and sends it back for revision until it reaches 8/10.
          </p>
        </div>

        <CreateDeckForm />

        <p className="text-xs text-muted-foreground">
          Tip: describe your idea in 20–2,000 characters and include any real
          figures you have. The deck only states numbers you give it; anything
          else appears as a [bracketed placeholder] for you to fill in.
        </p>
      </main>
    </>
  );
}
