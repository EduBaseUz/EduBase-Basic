import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

/** Format an ISO date string in Asia/Tashkent as YYYY-MM-DD. */
export function formatDate(value: string | Date | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
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
