import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMatchStore } from "@/store/useMatchStore";
import { useRosterStore } from "@/store/useRosterStore";
import { getPlayedCount } from "@/lib/playerStats";
import {
  averageRestGap,
  genderPatternCounts,
  odCounts,
} from "@/lib/analytics";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function Analytics() {
  const points = useMatchStore((s) => s.points);
  const players = useRosterStore((s) => s.players);

  const barData = useMemo(
    () =>
      [...players]
        .sort(
          (a, b) =>
            getPlayedCount(b.id, points) - getPlayedCount(a.id, points),
        )
        .map((p) => ({
          name: p.name,
          points: getPlayedCount(p.id, points),
        })),
    [players, points],
  );

  const minProgress = useMemo(
    () =>
      players.map((p) => {
        const played = getPlayedCount(p.id, points);
        const pct = Math.min(
          100,
          (played / Math.max(1, p.minTargetPoints)) * 100,
        );
        return { id: p.id, name: p.name, played, target: p.minTargetPoints, pct };
      }),
    [players, points],
  );

  const od = useMemo(() => odCounts(points), [points]);
  const odData = [
    { name: "O", value: od.O },
    { name: "D", value: od.D },
  ];

  const gp = useMemo(() => genderPatternCounts(points), [points]);
  const gpData = [
    { name: "4M-3F", value: gp["4M3F"] ?? 0 },
    { name: "4F-3M", value: gp["4F3M"] ?? 0 },
  ];

  const restGaps = useMemo(
    () =>
      players.map((p) => ({
        name: p.name,
        gap: averageRestGap(p.id, points),
      })),
    [players, points],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Usage, minimum targets, O/D and ratio mix, average rest between points.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Points played per player</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              />
              <Bar dataKey="points" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Min target progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {minProgress.map((row) => (
            <div key={row.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{row.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.played}/{row.target}
                </span>
              </div>
              <Progress value={row.pct} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">O vs D usage</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={odData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label
                >
                  {odData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gender pattern usage</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gpData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label
                >
                  {gpData.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Average rest gap (points between appearances)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={restGaps} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={70} />
              <YAxis />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              />
              <Bar dataKey="gap" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
