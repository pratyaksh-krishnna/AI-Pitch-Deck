import type { AgentUsage } from "@/lib/agents/agent-errors";
import { prisma } from "@/lib/db";

export async function recordUsage(deckId: string, agent: string, usage: AgentUsage): Promise<void> {
  await prisma.modelUsage.create({ data: { deckId, agent, ...usage } });
}
