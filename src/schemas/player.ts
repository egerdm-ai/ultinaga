import { z } from "zod";

export const genderTypeSchema = z.enum(["MMP", "FMP"]);
export const primaryRoleSchema = z.enum(["handler", "cutter", "hybrid"]);
export const sideStrengthSchema = z.enum(["O", "D", "two-way"]);
export const levelSchema = z.enum(["elite", "strong", "medium", "developing"]);

export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  gender: genderTypeSchema,
  primaryRole: primaryRoleSchema,
  secondaryRole: primaryRoleSchema.optional(),
  sideStrength: sideStrengthSchema,
  level: levelSchema,
  handlerReliability: z.number().min(1).max(10),
  cutterImpact: z.number().min(1).max(10),
  defenseImpact: z.number().min(1).max(10),
  deepThreat: z.number().min(1).max(10),
  redZone: z.number().min(1).max(10),
  minTargetPoints: z.number().min(0),
  softMaxPoints: z.number().optional(),
  injuryNote: z.string().optional(),
  notes: z.string().optional(),
  chemistryWith: z.array(z.string()).optional(),
  avoidWith: z.array(z.string()).optional(),
  preferredOnPoints: z.array(z.enum(["O", "D"])).optional(),
});

export const lineTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  side: z.enum(["O", "D"]),
  genderPattern: z.enum(["4M3F", "4F3M"]),
  players: z.array(z.string()).length(7),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const matchPointSchema = z.object({
  pointNumber: z.number().int().min(1),
  scoreUs: z.number().int().min(0),
  scoreThem: z.number().int().min(0),
  side: z.enum(["O", "D"]),
  genderPattern: z.enum(["4M3F", "4F3M"]),
  players: z.array(z.string()).length(7),
  result: z.enum(["scored", "conceded"]),
  notes: z.string().optional(),
});

export const teamRulesSchema = z.object({
  requireFemaleHandlerOn4F: z.boolean(),
  preferredFemaleHandlerO4F: z.string(),
  preferredFemaleHandlerD4F: z.string(),
  maleCutterPreference4F: z.array(z.string()),
  weakMaleCutterIds: z.array(z.string()),
  chemistryTripleBonus: z.tuple([z.string(), z.string(), z.string()]),
  handlerDuoPenalty: z.tuple([z.string(), z.string()]),
  yesimHandlerStrongHandlerMin: z.number().min(1).max(10),
  yesimHandlerStrongHandlerCount: z.number().min(0).max(6),
  hybridHandlerIds: z.array(z.string()),
  krisnaSoftLoadMultiplier: z.number().min(0).max(3),
  enforceAvoidWithHard: z.boolean(),
  twoTopFemalesOn4F: z.boolean(),
  topFemaleLevel: levelSchema,
  ramNajaMainHandlerPenaltyOnly: z.boolean(),
});

export const matchStateSchema = z.object({
  matchId: z.string(),
  opponent: z.string(),
  mode: z.enum(["close", "balanced", "blowout"]),
  targetMinPointsDefault: z.number(),
  points: z.array(matchPointSchema),
  roster: z.array(playerSchema),
  savedLines: z.array(lineTemplateSchema),
});
