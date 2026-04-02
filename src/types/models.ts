export type GenderType = "MMP" | "FMP";

export type PrimaryRole = "handler" | "cutter" | "hybrid";

export type SideStrength = "O" | "D" | "two-way";

export type Level = "elite" | "strong" | "medium" | "developing";

export type GameMode = "close" | "balanced" | "blowout";

export type PointSide = "O" | "D";

/** 4 male-matching + 3 female-matching, or 4 female + 3 male */
export type GenderPattern = "4M3F" | "4F3M";

export type PointResult = "scored" | "conceded";

export interface Player {
  id: string;
  name: string;
  gender: GenderType;
  primaryRole: PrimaryRole;
  secondaryRole?: PrimaryRole;
  sideStrength: SideStrength;
  level: Level;
  handlerReliability: number;
  cutterImpact: number;
  defenseImpact: number;
  deepThreat: number;
  redZone: number;
  minTargetPoints: number;
  softMaxPoints?: number;
  injuryNote?: string;
  notes?: string;
  chemistryWith?: string[];
  avoidWith?: string[];
  preferredOnPoints?: ("O" | "D")[];
}

export interface LineTemplate {
  id: string;
  name: string;
  side: PointSide;
  genderPattern: GenderPattern;
  players: string[];
  tags?: string[];
  notes?: string;
}

export interface MatchPoint {
  pointNumber: number;
  scoreUs: number;
  scoreThem: number;
  side: PointSide;
  genderPattern: GenderPattern;
  players: string[];
  result: PointResult;
  notes?: string;
}

export interface MatchState {
  matchId: string;
  opponent: string;
  mode: GameMode;
  targetMinPointsDefault: number;
  points: MatchPoint[];
  roster: Player[];
  savedLines: LineTemplate[];
}

export type UrgencyStatus = "ok" | "watch" | "critical";

export interface TeamRules {
  requireFemaleHandlerOn4F: boolean;
  preferredFemaleHandlerO4F: string;
  preferredFemaleHandlerD4F: string;
  maleCutterPreference4F: string[];
  weakMaleCutterIds: string[];
  chemistryTripleBonus: [string, string, string];
  handlerDuoPenalty: [string, string];
  yesimHandlerStrongHandlerMin: number;
  yesimHandlerStrongHandlerCount: number;
  hybridHandlerIds: string[];
  krisnaSoftLoadMultiplier: number;
  enforceAvoidWithHard: boolean;
  twoTopFemalesOn4F: boolean;
  topFemaleLevel: Level;
  ramNajaMainHandlerPenaltyOnly: boolean;
}
