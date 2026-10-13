import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { DeckStatus } from "@/lib/generated/prisma/client";
import { inngest } from "@/lib/inngest/client";
import { CreateDeckSchema } from "@/lib/schemas/create-deck";

/** List all decks, newest first. */
export async function GET() {
  const decks = await prisma.deck.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { slides: true } },
    },
  });

  return NextResponse.json(
    decks.map((deck) => ({
      id: deck.id,
      idea: deck.idea,
      title: deck.title,
      status: deck.status,
      errorMessage: deck.errorMessage,
      slideCount: deck._count.slides,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    })),
  );
}

/** Create a deck and start background generation. */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateDeckSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const deck = await prisma.deck.create({
    data: {
      idea: parsed.data.idea,
      status: DeckStatus.PENDING,
    },
  });

  await inngest.send({
    name: "deck/generate",
    data: { deckId: deck.id },
  });

  return NextResponse.json(
    { id: deck.id, status: deck.status },
    { status: 201 },
  );
}
