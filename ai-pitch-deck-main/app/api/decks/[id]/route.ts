import { NextResponse } from "next/server";

import { toDeckDetail } from "@/lib/deck/to-deck-detail";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

/** Get one deck with each slide's status, best version and revision history. */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const deck = await prisma.deck.findUnique({
    where: { id },
    include: { slides: { orderBy: { order: "asc" }, include: { versions: true } } },
  });
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  return NextResponse.json(toDeckDetail(deck));
}
