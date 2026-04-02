/** Team-specific tactical anchors and pedigree — drives scoring bias. */
export const TEAM = {
  oAnchor: "ege",
  dAnchor: "james",
  femaleHandlerO: "jessica",
  femaleHandlerD: "aj",
  chemistryTriple: ["ege", "yesim", "alp"] as const,
  eliteTwoWayBoost: ["alp"] as const,
  joelEliteCutterBoost: "joel",
  yesimEliteUsage: "yesim",
  natElite: "nat",
  yanDLean: "yan",
  marieStableVsMolly: { marie: "marie", molly: "molly" },
  krisnaLoad: "krisna",
  ramNaja: ["ram", "naja"] as const,
} as const;

/** Extra tactical weight multiplier for known high-leverage players (beyond raw stats). */
export function playerTacticalWeight(id: string): number {
  const w: Record<string, number> = {
    alp: 1.22,
    joel: 1.14,
    yesim: 1.12,
    ege: 1.1,
    james: 1.1,
    nat: 1.08,
    jessica: 1.06,
    aj: 1.06,
    krisna: 1.02,
    yan: 1.04,
    marie: 1.03,
    molly: 0.96,
    rafli: 0.92,
    alvin: 0.92,
  };
  return w[id] ?? 1;
}
