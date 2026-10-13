import { notFound } from "next/navigation";

import { DeckPlayerFallback } from "@/components/deck-player";
import { assembleDeckHtml } from "@/lib/hyperframes/assemble-deck";
import { validDraft, validTheme } from "@/lib/schemas/fixtures";

export default function DevDeckPlayerPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const slides = [1, 2].map((n) =>
    assembleDeckHtml(validTheme, [{
      sceneId: `s${n}-problem`,
      label: `Slide ${n}`,
      imageUrl: null,
      draft: {
        ...validDraft,
        markup: `<h1 id="s${n}-problem-headline" style="position:absolute;left:160px;top:420px;font-size:96px">Fixture slide ${n}</h1>`,
        css: "",
        animation: `tl.from("#s${n}-problem-headline", { opacity: 0, y: 40, duration: 0.6 }, t0 + 0.2);`,
      },
    }]),
  );

  return (
    <main className="mx-auto w-full max-w-4xl p-8">
      <DeckPlayerFallback slides={slides} />
    </main>
  );
}
