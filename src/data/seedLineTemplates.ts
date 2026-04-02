import type { LineTemplate } from "@/types/models";

export const SEED_LINE_TEMPLATES: LineTemplate[] = [
  {
    id: "best-o-4m3f",
    name: "Best O 4M3F",
    side: "O",
    genderPattern: "4M3F",
    players: ["ege", "ram", "jessica", "yesim", "nat", "joel", "alp"],
    tags: ["aggressive"],
    notes: "Best O 4M-3F from spec.",
  },
  {
    id: "best-o-4f3m",
    name: "Best O 4F3M",
    side: "O",
    genderPattern: "4F3M",
    players: ["ege", "james", "jessica", "yesim", "nat", "izzy", "alp"],
    tags: ["aggressive"],
  },
  {
    id: "best-d-4m3f",
    name: "Best D 4M3F",
    side: "D",
    genderPattern: "4M3F",
    players: ["james", "krisna", "aj", "nat", "izzy", "joel", "alp"],
    tags: ["safe"],
  },
  {
    id: "best-d-4f3m",
    name: "Best D 4F3M",
    side: "D",
    genderPattern: "4F3M",
    players: ["james", "krisna", "aj", "nat", "izzy", "marie", "joel"],
    tags: ["aggressive"],
  },
  {
    id: "safe-o-4m3f",
    name: "Safe O 4M3F",
    side: "O",
    genderPattern: "4M3F",
    players: ["ege", "ram", "jessica", "yesim", "marie", "joel", "alp"],
    tags: ["safe"],
  },
  {
    id: "balanced-d-4f3m",
    name: "Balanced D 4F3M",
    side: "D",
    genderPattern: "4F3M",
    players: ["james", "naja", "aj", "izzy", "marie", "molly", "joel"],
    tags: ["balanced"],
  },
];
