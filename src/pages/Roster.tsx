import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRosterStore } from "@/store/useRosterStore";
import { playerSchema } from "@/schemas/player";
import type { Player } from "@/types/models";
import { z } from "zod";

const formSchema = playerSchema;
type FormValues = z.infer<typeof formSchema>;

const emptyPlayer = (id: string): FormValues => ({
  id,
  name: "",
  gender: "MMP",
  primaryRole: "cutter",
  sideStrength: "two-way",
  level: "medium",
  handlerReliability: 5,
  cutterImpact: 5,
  defenseImpact: 5,
  deepThreat: 5,
  redZone: 5,
  minTargetPoints: 4,
  softMaxPoints: 7,
});

export function Roster() {
  const players = useRosterStore((s) => s.players);
  const upsert = useRosterStore((s) => s.upsertPlayer);
  const reset = useRosterStore((s) => s.resetToSeed);
  const [genderFilter, setGenderFilter] = useState<"all" | "MMP" | "FMP">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | Player["primaryRole"]>(
    "all",
  );
  const [sideFilter, setSideFilter] = useState<"all" | Player["sideStrength"]>(
    "all",
  );

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (genderFilter !== "all" && p.gender !== genderFilter) return false;
      if (roleFilter !== "all" && p.primaryRole !== roleFilter) return false;
      if (sideFilter !== "all" && p.sideStrength !== sideFilter) return false;
      return true;
    });
  }, [players, genderFilter, roleFilter, sideFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roster</h1>
          <p className="text-muted-foreground">
            Filters, edit player profiles, chemistry and avoid tags.
          </p>
        </div>
        <Button variant="outline" onClick={() => reset()}>
          Reset to seed data
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <Label>Gender</Label>
            <Select
              value={genderFilter}
              onValueChange={(v) => setGenderFilter(v as typeof genderFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="MMP">Male-matching</SelectItem>
                <SelectItem value="FMP">Female-matching</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Primary role</Label>
            <Select
              value={roleFilter}
              onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="handler">Handler</SelectItem>
                <SelectItem value="cutter">Cutter</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Side strength</Label>
            <Select
              value={sideFilter}
              onValueChange={(v) => setSideFilter(v as typeof sideFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="O">O</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="two-way">Two-way</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Players ({filtered.length})</CardTitle>
          <PlayerDialog
            title="Add player"
            initial={emptyPlayer(`player-${Date.now().toString(36)}`)}
            onSave={(p) => upsert(p as Player)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>O/D</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.primaryRole}</TableCell>
                  <TableCell>{p.level}</TableCell>
                  <TableCell>{p.sideStrength}</TableCell>
                  <TableCell className="max-w-[220px]">
                    <div className="flex flex-wrap gap-1">
                      {p.chemistryWith?.map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px]">
                          +{c}
                        </Badge>
                      ))}
                      {p.avoidWith?.map((c) => (
                        <Badge
                          key={c}
                          variant="outline"
                          className="text-[10px] text-destructive"
                        >
                          −{c}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <PlayerDialog
                      title={`Edit ${p.name}`}
                      initial={p as FormValues}
                      onSave={(x) => upsert(x as Player)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PlayerDialog({
  title,
  initial,
  onSave,
}: {
  title: string;
  initial: FormValues;
  onSave: (p: FormValues) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initial,
    values: initial,
  });

  return (
    <Dialog>
      <DialogTrigger
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        {title.startsWith("Add") ? "Add" : "Edit"}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((data) => {
            onSave(data);
          })}
        >
          <div className="grid gap-2">
            <Label>Id</Label>
            <Input {...form.register("id")} disabled />
          </div>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="grid gap-2">
            <Label>Gender</Label>
            <Select
              value={form.watch("gender")}
              onValueChange={(v) =>
                form.setValue("gender", v as FormValues["gender"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MMP">MMP</SelectItem>
                <SelectItem value="FMP">FMP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Primary role</Label>
            <Select
              value={form.watch("primaryRole")}
              onValueChange={(v) =>
                form.setValue("primaryRole", v as FormValues["primaryRole"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="handler">Handler</SelectItem>
                <SelectItem value="cutter">Cutter</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Level</Label>
              <Select
                value={form.watch("level")}
                onValueChange={(v) =>
                  form.setValue("level", v as FormValues["level"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elite">Elite</SelectItem>
                  <SelectItem value="strong">Strong</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="developing">Developing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Side</Label>
              <Select
                value={form.watch("sideStrength")}
                onValueChange={(v) =>
                  form.setValue("sideStrength", v as FormValues["sideStrength"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="O">O</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                  <SelectItem value="two-way">Two-way</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Handler rel.</Label>
              <Input type="number" {...form.register("handlerReliability", { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Cutter</Label>
              <Input type="number" {...form.register("cutterImpact", { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Defense</Label>
              <Input type="number" {...form.register("defenseImpact", { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Min target</Label>
              <Input type="number" {...form.register("minTargetPoints", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Chemistry ids (comma)</Label>
            <Input
              defaultValue={(initial.chemistryWith ?? []).join(",")}
              onBlur={(e) =>
                form.setValue(
                  "chemistryWith",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Avoid ids (comma)</Label>
            <Input
              defaultValue={(initial.avoidWith ?? []).join(",")}
              onBlur={(e) =>
                form.setValue(
                  "avoidWith",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
