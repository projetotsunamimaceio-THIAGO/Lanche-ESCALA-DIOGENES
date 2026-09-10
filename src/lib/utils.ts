import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { JS_DAY_TO_APP_DAY, WEEKDAYS } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateToYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYYYYMMDD(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function formatShortDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

export function formatLongDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function generateWorkDays(startStr: string, endStr: string) {
  const start = parseYYYYMMDD(startStr);
  const end = parseYYYYMMDD(endStr);
  if (!start || !end || start > end) return [];

  const days = [];
  const current = new Date(start);
  current.setHours(12, 0, 0, 0);
  const endMs = new Date(end).setHours(12, 0, 0, 0);

  while (current.getTime() <= endMs) {
    const jsDay = current.getDay();
    const appDay = JS_DAY_TO_APP_DAY[jsDay];
    if (appDay !== null && appDay !== undefined) {
      days.push({
        date: new Date(current),
        dateStr: formatDateToYYYYMMDD(current),
        dayId: appDay,
        formattedShort: formatShortDate(current),
        formattedLong: formatLongDate(current),
        weekDayLabel: WEEKDAYS[appDay].short,
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function groupIntoWeeks(workDays: any[]) {
  const weeksMap = new Map();
  workDays.forEach((day) => {
    const monday = getMondayOfWeek(day.date);
    const mondayStr = formatDateToYYYYMMDD(monday);
    if (!weeksMap.has(mondayStr)) {
      weeksMap.set(mondayStr, {
        idx: -1,
        monday,
        days: [],
        label: "",
        rangeShort: "",
      });
    }
    weeksMap.get(mondayStr).days.push(day);
  });

  const weeks = Array.from(weeksMap.values()).sort(
    (a, b) => a.monday.getTime() - b.monday.getTime()
  );

  weeks.forEach((week, idx) => {
    week.idx = idx;
    week.days.sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
    const first = week.days[0];
    const last = week.days[week.days.length - 1];
    const range = first && last ? `${first.formattedShort} a ${last.formattedShort}` : "";
    week.rangeShort = range;
    week.label = `Semana ${idx + 1} - ${range}`;
  });

  return weeks;
}
