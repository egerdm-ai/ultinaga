import type { TeamRules } from "@/types/models";

export const DEFAULT_TEAM_RULES: TeamRules = {
  requireFemaleHandlerOn4F: true,
  preferredFemaleHandlerO4F: "jessica",
  preferredFemaleHandlerD4F: "aj",
  maleCutterPreference4F: ["alp", "joel", "ege"],
  weakMaleCutterIds: ["rafli", "alvin", "jojo"],
  chemistryTripleBonus: ["ege", "yesim", "alp"],
  handlerDuoPenalty: ["ram", "naja"],
  yesimHandlerStrongHandlerMin: 7,
  yesimHandlerStrongHandlerCount: 2,
  hybridHandlerIds: ["alp", "joel"],
  krisnaSoftLoadMultiplier: 1.35,
  enforceAvoidWithHard: true,
  twoTopFemalesOn4F: false,
  topFemaleLevel: "strong",
  ramNajaMainHandlerPenaltyOnly: true,
  exemptConsecutivePlayIds: ["ege", "alp", "yesim", "joel"],
};
