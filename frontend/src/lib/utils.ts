import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type NameParts = { lastName?: string; firstName?: string; fullName?: string };

/** "Familiya Ism" — sharifsiz qisqa ism. */
export function shortName(u: NameParts): string {
  const ln = u.lastName?.trim();
  const fn = u.firstName?.trim();
  if (ln || fn) return [ln, fn].filter(Boolean).join(" ");
  const parts = (u.fullName ?? "").trim().split(/\s+/);
  return parts.slice(0, 2).join(" ") || (u.fullName ?? "");
}

/** Avatar uchun bosh harflar (Familiya + Ism). */
export function nameInitials(u: NameParts): string {
  const parts = shortName(u).trim().split(/\s+/);
  const text = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return text.toUpperCase() || "?";
}

/** Format a number as UZS so'm, e.g. 500000 -> "500 000 so'm". */
export function formatUZS(amount: number | undefined | null): string {
  const n = amount ?? 0;
  const formatted = new Intl.NumberFormat("uz-UZ").format(n).replace(/,/g, " ");
  return `${formatted} so'm`;
}

/** Faqat raqamlarni qoldiradi va N ta bilan cheklaydi. */
export function onlyDigits(value: string, max = 9): string {
  return value.replace(/\D/g, "").slice(0, max);
}

/** 9 ta raqamni "90 100 0002" ko'rinishida formatlaydi (input ichida). */
export function formatPhoneInput(digits: string): string {
  const d = onlyDigits(digits);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 5);
  const p3 = d.slice(5, 9);
  return [p1, p2, p3].filter(Boolean).join(" ");
}

/** To'liq raqamni "+998 90 100 0002" ko'rinishida ko'rsatadi. */
export function formatPhoneDisplay(raw: string | undefined): string {
  if (!raw) return "—";
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("998")) d = d.slice(3);
  d = d.slice(0, 9);
  if (!d) return "—";
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 5);
  const p3 = d.slice(5, 9);
  return `+998 ${[p1, p2, p3].filter(Boolean).join(" ")}`;
}

const UZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

/** Format a date as "12-may 2026-yil" (Asia/Tashkent). */
export function formatDate(value: string | Date | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "0");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "0");
  const monthName = UZ_MONTHS[month - 1] ?? "";
  return `${day}-${monthName} ${year}-yil`;
}

/** Group digits in threes with spaces, e.g. "500000" -> "500 000". */
export function formatThousands(value: string | number | undefined | null): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Current period in YYYY-MM (Asia/Tashkent). */
export function currentPeriod(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}`;
}
