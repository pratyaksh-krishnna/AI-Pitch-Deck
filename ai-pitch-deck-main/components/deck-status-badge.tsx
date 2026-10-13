import { Badge } from "@/components/ui/badge";
import type { DeckStatus } from "@/lib/types/deck";

const statusLabels: Record<DeckStatus, string> = {
  PENDING: "Pending",
  GENERATING: "Generating",
  COMPLETE: "Complete",
  FAILED: "Failed",
};

const statusVariants: Record<
  DeckStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "secondary",
  GENERATING: "default",
  COMPLETE: "outline",
  FAILED: "destructive",
};

export function DeckStatusBadge({ status }: { status: DeckStatus }) {
  return (
    <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
  );
}
