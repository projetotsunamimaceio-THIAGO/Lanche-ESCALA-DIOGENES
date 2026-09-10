export interface Teacher {
  id: string;
  name: string;
  days: number[]; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
  timesPerMonth: number;
}

export interface Holiday {
  id: string;
  dateStr: string; // YYYY-MM-DD
  name: string;
}

export interface ScheduleDay {
  id: string; // dateStr
  dateStr: string;
  dayId: number;
  weekIdx: number;
  teacherId: string | null;
}

export interface AppState {
  startDate: string;
  endDate: string;
  isGenerated: boolean;
}

export const WEEKDAYS = [
  { id: 0, short: "Seg", full: "Segunda", jsDay: 1 },
  { id: 1, short: "Ter", full: "Terça", jsDay: 2 },
  { id: 2, short: "Qua", full: "Quarta", jsDay: 3 },
  { id: 3, short: "Qui", full: "Quinta", jsDay: 4 },
  { id: 4, short: "Sex", full: "Sexta", jsDay: 5 },
];

export const JS_DAY_TO_APP_DAY: Record<number, number | null> = {
  0: null, // Sunday
  1: 0, // Monday
  2: 1, // Tuesday
  3: 2, // Wednesday
  4: 3, // Thursday
  5: 4, // Friday
  6: null, // Saturday
};
