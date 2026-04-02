import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useMatchStore } from "@/store/useMatchStore";
import { useRosterStore } from "@/store/useRosterStore";
import { useRecommendation } from "@/hooks/useRecommendation";
import { LineRecommendationCard } from "@/components/LineRecommendationCard";
import {
  computeMinTargetUrgency,
  urgencyStatus,
} from "@/lib/urgency";
import { getLastPointPlayerIds } from "@/lib/playerStats";
import { lineNames } from "@/lib/explainLine";
import { UrgencyBadge } from "@/components/UrgencyBadge";

export function Dashboard() {
  const points = useMatchStore((s) => s.points);
  const scoreUs = useMatchStore((s) => s.scoreUs);
  const scoreThem = useMatchStore((s) => s.scoreThem);
  const nextSide = useMatchStore((s) => s.nextSide);
  const nextGenderPattern = useMatchStore((s) => s.nextGenderPattern);
  const mode = useMatchStore((s) => s.mode);
  const players = useRosterStore((s) => s.players);
  const rec = useRecommendation();
  const currentPoint =
    points.length === 0 ? 1 : Math.max(...points.map((p) => p.pointNumber)) + 1;
  const lastIds = getLastPointPlayerIds(points);

  const pressure = players
    .map((p) => ({
      p,
      u: computeMinTargetUrgency(p, {
        points,
        currentPointNumber: currentPoint,
        scoreUs,
        scoreThem,
        mode,
      }),
    }))
    .filter((x) => x.u > 0.15)
    .sort((a, b) => b.u - a.u)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Quick snapshot before the next point.
          </p>
        </div>
        <Link to="/match" className={buttonVariants()}>
          Open live match
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Score
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {scoreUs} — {scoreThem}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next point #
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {currentPoint}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next side / ratio
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {nextSide} ·{" "}
            {nextGenderPattern === "4M3F" ? "4M-3F" : "4F-3M"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold capitalize">{mode}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <LineRecommendationCard
          title="Suggested line"
          variant="best"
          line={rec.best}
          roster={players}
        />
        <LineRecommendationCard
          title="Rotation-safe"
          variant="safe"
          line={rec.rotationSafe}
          roster={players}
        />
        <LineRecommendationCard
          title="Min-target pressure"
          variant="aggressive"
          line={rec.mustPlayPressure}
          roster={players}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Min target pressure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pressure.length === 0 ? (
              <p className="text-sm text-muted-foreground">No urgent gaps.</p>
            ) : (
              pressure.map(({ p, u }) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{p.name}</span>
                  <UrgencyBadge status={urgencyStatus(u)} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cannot play now</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {lastIds.length ? (
              <p>
                Previous point:{" "}
                {lastIds
                  .map((id) => players.find((x) => x.id === id)?.name ?? id)
                  .join(", ")}
              </p>
            ) : (
              <p>No previous point — everyone eligible.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Best line (text)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {lineNames(rec.best, players)}
        </CardContent>
      </Card>
    </div>
  );
}
