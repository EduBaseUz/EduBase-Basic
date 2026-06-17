export const GROUP_BASE = "/admin/groups";

export const DAYS = [
  { key: "mon", label: "Du" },
  { key: "tue", label: "Se" },
  { key: "wed", label: "Ch" },
  { key: "thu", label: "Pa" },
  { key: "fri", label: "Ju" },
  { key: "sat", label: "Sh" },
  { key: "sun", label: "Ya" },
];

export function dayLabels(days: string[]): string {
  return days.map((d) => DAYS.find((x) => x.key === d)?.label ?? d).join(", ");
}
