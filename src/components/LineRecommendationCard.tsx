import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScoredLine } from "@/lib/recommendationEngine";
import type { Player } from "@/types/models";
import { rosterById } from "@/lib/playerStats";
export function LineRecommendationCard({
  title,
  variant,
  line,
  roster,
}: {
  title: string;
  variant: "best" | "safe" | "aggressive";
  line: ScoredLine | null;
  roster: Player[];
}) {
  const map = rosterById(roster);
  const bullets =
    line?.bullets?.length ? line.bullets : ["No suggestion available."];
  const tone =
    variant === "best"
      ? "border-primary/30"
      : variant === "safe"
        ? "border-emerald-500/30"
        : "border-amber-500/30";

  return (
    <Card className={tone}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant="secondary">
              {line ? line.score.toFixed(2) : "—"}
            </Badge>
          </div>
          {line?.kindLabel && (
            <Badge variant="outline" className="w-fit text-xs font-normal">
              {line.kindLabel}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-1.5">
          {line?.playerIds.map((id) => (
            <span
              key={id}
              className="rounded-md bg-muted px-2 py-0.5 font-medium"
            >
              {map.get(id)?.name ?? id}
            </span>
          )) ?? <span className="text-muted-foreground">No line</span>}
        </div>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        {line?.warnings && line.warnings.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-900 dark:text-amber-100">
            {line.warnings.slice(0, 3).map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
