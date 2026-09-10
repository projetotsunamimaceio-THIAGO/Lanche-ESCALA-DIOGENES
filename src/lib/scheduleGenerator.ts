import { Teacher, Holiday, ScheduleDay } from "../types";
import { generateWorkDays, groupIntoWeeks } from "./utils";

export function generateSchedule(
  startDateStr: string,
  endDateStr: string,
  teachers: Teacher[],
  holidays: Holiday[]
): ScheduleDay[] {
  const workDays = generateWorkDays(startDateStr, endDateStr);
  const holidaySet = new Set(holidays.map((h) => h.dateStr));
  const validDays = workDays.filter((d) => !holidaySet.has(d.dateStr));
  const weeks = groupIntoWeeks(workDays);

  const dayToWeekIdx = new Map<string, number>();
  weeks.forEach((w) => {
    w.days.forEach((d: any) => dayToWeekIdx.set(d.dateStr, w.idx));
  });

  const schedules: ScheduleDay[] = [];
  const assigned = new Map<string, string | null>(); // dateStr -> teacherId
  
  validDays.forEach((d) => assigned.set(d.dateStr, null));

  const teacherAssignments: Record<string, any[]> = {};
  teachers.forEach((t) => (teacherAssignments[t.id] = []));

  // Sort teachers by least availability and max times per month
  const tStats = teachers.map((t) => ({
    t,
    avail: validDays.filter((d) => t.days.includes(d.dayId)).length,
  }));
  tStats.sort((a, b) => a.avail - b.avail || b.t.timesPerMonth - a.t.timesPerMonth);
  let sortedTeachers = tStats.map((s) => s.t);

  // Randomize a bit to spread better
  for (let i = sortedTeachers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sortedTeachers[i], sortedTeachers[j]] = [sortedTeachers[j], sortedTeachers[i]];
  }

  const N = validDays.length;

  for (const t of sortedTeachers) {
    const limit = Math.min(t.timesPerMonth, N);
    if (limit <= 0) continue;

    const spacing = N / limit;
    for (let i = 0; i < limit; i++) {
      if (teacherAssignments[t.id].length >= limit) break;

      const jitter = (Math.random() - 0.5) * spacing * 0.7;
      const targetIdx = i * spacing + spacing * 0.35 + jitter;
      let bestIdx = Math.round(targetIdx);
      bestIdx = Math.max(0, Math.min(N - 1, bestIdx));

      let chosenDay = null;
      for (let offset = 0; offset < N && !chosenDay; offset++) {
        const candidates = [];
        if (offset === 0) candidates.push(bestIdx);
        else {
          if (bestIdx + offset < N) candidates.push(bestIdx + offset);
          if (bestIdx - offset >= 0) candidates.push(bestIdx - offset);
        }
        if (candidates.length === 2 && Math.random() > 0.5) candidates.reverse();

        for (const cIdx of candidates) {
          const day = validDays[cIdx];
          if (!day) continue;
          if (assigned.get(day.dateStr) !== null) continue; // already taken
          if (!t.days.includes(day.dayId)) continue; // teacher not available on this weekday

          const weekIdx = dayToWeekIdx.get(day.dateStr) ?? 0;
          
          // Rule: max 1x per week, and 1 week gap.
          // That means they cannot be scheduled in weekIdx - 1, weekIdx, or weekIdx + 1
          const conflict = teacherAssignments[t.id].some(
            (a) => Math.abs(a.weekIdx - weekIdx) <= 1
          );
          if (conflict) continue;

          chosenDay = day;
          break;
        }
      }

      if (chosenDay) {
        assigned.set(chosenDay.dateStr, t.id);
        const weekIdx = dayToWeekIdx.get(chosenDay.dateStr) ?? 0;
        teacherAssignments[t.id].push({ day: chosenDay, weekIdx });
        teacherAssignments[t.id].sort((a, b) => a.day.date.getTime() - b.day.date.getTime());
      }
    }
  }

  // Fallback pass for empty days
  const emptyDays = [...validDays.filter((d) => assigned.get(d.dateStr) === null)]
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const day of emptyDays) {
    if (assigned.get(day.dateStr) !== null) continue;
    
    const weekIdx = dayToWeekIdx.get(day.dateStr) ?? 0;
    const eligibleTeachers = teachers.filter((t) => {
      if (!t.days.includes(day.dayId)) return false;
      if (teacherAssignments[t.id].length >= t.timesPerMonth) return false;
      const conflict = teacherAssignments[t.id].some((a) => Math.abs(a.weekIdx - weekIdx) <= 1);
      if (conflict) return false;
      return true;
    });

    if (eligibleTeachers.length === 0) continue;

    eligibleTeachers.sort((a, b) => {
      const lenA = teacherAssignments[a.id].length;
      const lenB = teacherAssignments[b.id].length;
      if (lenA !== lenB) return lenA - lenB;
      
      const lastA = teacherAssignments[a.id][teacherAssignments[a.id].length - 1];
      const lastB = teacherAssignments[b.id][teacherAssignments[b.id].length - 1];
      
      const distA = lastA ? Math.abs(validDays.findIndex(d => d.dateStr === day.dateStr) - validDays.findIndex(d => d.dateStr === lastA.day.dateStr)) : 999;
      const distB = lastB ? Math.abs(validDays.findIndex(d => d.dateStr === day.dateStr) - validDays.findIndex(d => d.dateStr === lastB.day.dateStr)) : 999;
      return distB - distA;
    });

    const chosen = eligibleTeachers[0];
    assigned.set(day.dateStr, chosen.id);
    teacherAssignments[chosen.id].push({ day, weekIdx });
    teacherAssignments[chosen.id].sort((a, b) => a.day.date.getTime() - b.day.date.getTime());
  }

  validDays.forEach((day) => {
    const weekIdx = dayToWeekIdx.get(day.dateStr) ?? 0;
    const teacherId = assigned.get(day.dateStr) || null;
    schedules.push({
      id: day.dateStr,
      dateStr: day.dateStr,
      dayId: day.dayId,
      weekIdx,
      teacherId,
    });
  });

  return schedules.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}
