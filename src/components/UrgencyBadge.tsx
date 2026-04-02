import { Badge } from "@/components/ui/badge";
import type { UrgencyStatus } from "@/types/models";
import { cn } from "@/lib/utils";

const styles: Record<UrgencyStatus, string> = {
  ok: "border-[color:var(--urgency-ok)]/40 bg-[color:var(--urgency-ok)]/15 text-[color:var(--urgency-ok)]",
  watch: "border-[color:var(--urgency-watch)]/40 bg-[color:var(--urgency-watch)]/15 text-[color:var(--urgency-watch)]",
  critical:
    "border-[color:var(--urgency-critical)]/40 bg-[color:var(--urgency-critical)]/15 text-[color:var(--urgency-critical)]",
};

const labels: Record<UrgencyStatus, string> = {
  ok: "OK",
  watch: "Watch",
  critical: "Critical",
};

export function UrgencyBadge({
  status,
  className,
}: {
  status: UrgencyStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(styles[status], className)}>
      {labels[status]}
    </Badge>
  );
}
