import Link from "next/link";

import { DeckViewer } from "@/components/deck-viewer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DeckDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-12">
        <Button variant="ghost" size="sm" className="w-fit" render={<Link href="/decks" />}>
          ← Back to decks
        </Button>
        <DeckViewer deckId={id} />
      </main>
    </>
  );
}
