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
            Describe your startup or project idea. AI will generate slides with
            images — powered by OpenAI Agents, Inngest, and ImageKit.
          </p>
        </div>

        <CreateDeckForm />

        <p className="text-xs text-muted-foreground">
          Tip: include enough detail (at least 20 characters) so the AI guardrails
          accept your idea.
        </p>
      </main>
    </>
  );
}
