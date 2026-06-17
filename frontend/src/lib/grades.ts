/**
 * Grade letter mapping (1-10 -> P/M/D).
 * 1-4 -> P (yomon), 5-7 -> M (yaxshi), 8-10 -> D (a'lo).
 * Students must only ever see the letter, never the numeric score.
 */
export type GradeLetter = "P" | "M" | "D";

export function scoreToLetter(score: number): GradeLetter | "" {
  if (score >= 8) return "D";
  if (score >= 5) return "M";
  if (score >= 1) return "P";
  return "";
}

/**
 * Bitta dars uchun umumiy baho (uy vazifasi + faollik yig'indisi, maks 20):
 * 1-9 -> P, 10-15 -> M, 16-20 -> D.
 */
export function sumToLetter(total: number): GradeLetter | "" {
  if (total >= 16) return "D";
  if (total >= 10) return "M";
  if (total >= 1) return "P";
  return "";
}

export const letterLabels: Record<GradeLetter, string> = {
  P: "P — yomon",
  M: "M — yaxshi",
  D: "D — a'lo",
};

export function letterColor(letter: string): string {
  switch (letter) {
    case "D":
      return "text-green-600 dark:text-green-400";
    case "M":
      return "text-yellow-600 dark:text-yellow-400";
    case "P":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}
