import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarDays,
  CalendarOff,
  CalendarRange,
  ChartColumn,
  Check,
  ChevronDown,
  Clock3,
  Coffee,
  Copy,
  Eraser,
  GraduationCap,
  Hash,
  PartyPopper,
  Pencil,
  Plus,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Sun,
  TimerReset,
  Trash2,
  TriangleAlert,
  Users,
  UtensilsCrossed,
} from "lucide-react";

import { initFirebase } from "./lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

import {
  Teacher,
  Holiday,
  ScheduleDay,
  AppState,
  WEEKDAYS,
  JS_DAY_TO_APP_DAY,
} from "./types";
import { generateSchedule } from "./lib/scheduleGenerator";
import {
  formatDateToYYYYMMDD,
  formatLongDate,
  formatShortDate,
  parseYYYYMMDD,
  generateWorkDays,
  groupIntoWeeks,
} from "./lib/utils";

export default function App() {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [db, setDb] = useState<any>(null);

  // Firestore Data State
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [schedules, setSchedules] = useState<ScheduleDay[]>([]);
  const [appState, setAppState] = useState<AppState>({
    startDate: formatDateToYYYYMMDD(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    endDate: formatDateToYYYYMMDD(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)),
    isGenerated: false,
  });

  // Local Form State
  const [teacherName, setTeacherName] = useState("");
  const [teacherDays, setTeacherDays] = useState<number[]>([]);
  const [teacherTimes, setTeacherTimes] = useState(2);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  const [holidayDateStr, setHolidayDateStr] = useState("");
  const [holidayName, setHolidayName] = useState("");

  useEffect(() => {
    initFirebase().then(({ db }) => {
      setDb(db);
      setIsFirebaseReady(true);

      const unsubTeachers = onSnapshot(collection(db, "teachers"), (snap) => {
        setTeachers(snap.docs.map((d) => d.data() as Teacher));
      });
      const unsubHolidays = onSnapshot(collection(db, "holidays"), (snap) => {
        setHolidays(snap.docs.map((d) => d.data() as Holiday).sort((a, b) => a.dateStr.localeCompare(b.dateStr)));
      });
      const unsubSchedules = onSnapshot(collection(db, "schedules"), (snap) => {
        setSchedules(snap.docs.map((d) => d.data() as ScheduleDay).sort((a, b) => a.dateStr.localeCompare(b.dateStr)));
      });
      const unsubAppState = onSnapshot(doc(db, "app_state", "main"), (snap) => {
        if (snap.exists()) setAppState(snap.data() as AppState);
      });

      return () => {
        unsubTeachers();
        unsubHolidays();
        unsubSchedules();
        unsubAppState();
      };
    }).catch(err => {
      console.error("Failed to init Firebase:", err);
      setFirebaseError(err.message || "Failed to initialize database");
    });
  }, []);

  const handleUpdateAppState = async (updates: Partial<AppState>) => {
    if (!db) return;
    const newState = { ...appState, ...updates };
    setAppState(newState);
    await setDoc(doc(db, "app_state", "main"), newState, { merge: true });
  };

  const handleToggleTeacherDay = (dayId: number) => {
    if (teacherDays.includes(dayId)) setTeacherDays(teacherDays.filter((d) => d !== dayId));
    else setTeacherDays([...teacherDays, dayId].sort());
  };

  const handleSaveTeacher = async () => {
    if (!teacherName.trim() || teacherDays.length === 0 || !db) return;
    const id = editingTeacherId || Date.now().toString();
    const t: Teacher = {
      id,
      name: teacherName.trim(),
      days: teacherDays,
      timesPerMonth: Math.min(8, Math.max(1, teacherTimes || 1)),
    };
    await setDoc(doc(db, "teachers", id), t);
    setEditingTeacherId(null);
    setTeacherName("");
    setTeacherDays([]);
    setTeacherTimes(2);
  };

  const handleEditTeacher = (t: Teacher) => {
    setEditingTeacherId(t.id);
    setTeacherName(t.name);
    setTeacherDays(t.days);
    setTeacherTimes(t.timesPerMonth);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, "teachers", id));
    if (editingTeacherId === id) {
      setEditingTeacherId(null);
      setTeacherName("");
      setTeacherDays([]);
      setTeacherTimes(2);
    }
  };

  const handleAddHoliday = async () => {
    if (!holidayDateStr || !holidayName.trim() || !db) return;
    if (!parseYYYYMMDD(holidayDateStr)) return;
    const id = Date.now().toString();
    const h: Holiday = { id, dateStr: holidayDateStr, name: holidayName.trim() };
    await setDoc(doc(db, "holidays", id), h);
    setHolidayDateStr("");
    setHolidayName("");
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, "holidays", id));
  };

  const handleGenerate = async () => {
    if (!db || teachers.length === 0) return;
    const result = generateSchedule(appState.startDate, appState.endDate, teachers, holidays);
    
    const batch = writeBatch(db);
    
    // Clear old schedules
    schedules.forEach((s) => {
      batch.delete(doc(db, "schedules", s.id));
    });
    
    // Write new
    result.forEach((s) => {
      batch.set(doc(db, "schedules", s.id), s);
    });

    await batch.commit();
    await handleUpdateAppState({ isGenerated: true });
  };

  const handleClearSchedule = async () => {
    if (!db) return;
    const batch = writeBatch(db);
    schedules.forEach((s) => {
      batch.delete(doc(db, "schedules", s.id));
    });
    await batch.commit();
    await handleUpdateAppState({ isGenerated: false });
  };

  const handleAssignTeacher = async (dateStr: string, teacherId: string | null) => {
    if (!db) return;
    await setDoc(doc(db, "schedules", dateStr), { teacherId }, { merge: true });
  };

  const handleCopy = () => {
    const lines: string[] = [];
    const sd = parseYYYYMMDD(appState.startDate);
    const ed = parseYYYYMMDD(appState.endDate);
    if (sd && ed) {
      lines.push(`Escala de ${formatLongDate(sd)} até ${formatLongDate(ed)}`);
    }
    if (holidays.length > 0) {
      lines.push(`Feriados: ${holidays.map(h => `${h.dateStr} - ${h.name}`).join(", ")}`);
    }
    lines.push("");

    weeks.forEach((w) => {
      lines.push(`${w.label}:`);
      w.days.forEach((d: any) => {
        const hol = holidayMap.get(d.dateStr);
        if (hol) {
          lines.push(`  ${d.formattedLong} (${WEEKDAYS[d.dayId].full}): FERIADO - ${hol.name}`);
          return;
        }
        const sch = schedules.find(s => s.dateStr === d.dateStr);
        const t = sch?.teacherId ? teachers.find(x => x.id === sch.teacherId) : null;
        lines.push(`  ${d.formattedLong} (${WEEKDAYS[d.dayId].full}): ${t ? `${t.name} (${teacherCounts[t.id] || 0}/${t.timesPerMonth}x)` : "— vazio —"}`);
      });
      lines.push("");
    });

    lines.push("Resumo por professor:");
    teachers.forEach((t) => {
      const dates = teacherDates[t.id] || [];
      const intervals = dates.length > 1 ? dates.slice(1).map((d: any, i: number) => {
        return `${Math.round((d.date.getTime() - dates[i].date.getTime()) / 86400000)}d`;
      }).join(", ") : "";
      lines.push(`- ${t.name}: ${dates.map((d: any) => d.formattedLong).join(", ") || "nenhum"}${intervals ? ` (intervalos: ${intervals})` : ""}`);
    });

    navigator.clipboard?.writeText(lines.join("\\n"));
    alert("Copiado para a área de transferência!");
  };

  // Derived state
  const workDays = useMemo(() => generateWorkDays(appState.startDate, appState.endDate), [appState.startDate, appState.endDate]);
  const holidayMap = useMemo(() => new Map(holidays.map(h => [h.dateStr, h])), [holidays]);
  const validDays = useMemo(() => workDays.filter(d => !holidayMap.has(d.dateStr)), [workDays, holidayMap]);
  const weeks = useMemo(() => groupIntoWeeks(workDays), [workDays]);

  const teacherCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    schedules.forEach(s => {
      if (s.teacherId) counts[s.teacherId] = (counts[s.teacherId] || 0) + 1;
    });
    return counts;
  }, [schedules]);

  const teacherDates = useMemo(() => {
    const dates: Record<string, any[]> = {};
    const validDaysMap = new Map(validDays.map(d => [d.dateStr, d]));
    schedules.forEach(s => {
      if (!s.teacherId) return;
      const d = validDaysMap.get(s.dateStr);
      if (d) {
        if (!dates[s.teacherId]) dates[s.teacherId] = [];
        dates[s.teacherId].push(d);
      }
    });
    Object.values(dates).forEach(arr => arr.sort((a, b) => a.date.getTime() - b.date.getTime()));
    return dates;
  }, [schedules, validDays]);

  const unassignedSchedules = useMemo(() => schedules.filter(s => !s.teacherId), [schedules]);
  const isDatesValid = parseYYYYMMDD(appState.startDate) && parseYYYYMMDD(appState.endDate) && parseYYYYMMDD(appState.startDate)! <= parseYYYYMMDD(appState.endDate)!;
  const canGenerate = teachers.length > 0 && validDays.length > 0 && isDatesValid;

  const getCalendarMonths = () => {
    const start = parseYYYYMMDD(appState.startDate);
    const end = parseYYYYMMDD(appState.endDate);
    if (!start || !end) return [];
    const months = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMs = new Date(end.getFullYear(), end.getMonth(), 1).getTime();
    while (cur.getTime() <= endMs) {
      months.push({
        year: cur.getFullYear(),
        month: cur.getMonth(),
        label: cur.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  };

  if (!isFirebaseReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FC]">
        {firebaseError ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <TriangleAlert className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-slate-900 font-bold">Erro ao conectar ao banco de dados</p>
            <p className="text-slate-500 text-sm mt-1">{firebaseError}</p>
          </>
        ) : (
          <p className="text-slate-600 font-medium">Carregando banco de dados...</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-slate-800 font-[Inter,system-ui,sans-serif] selection:bg-amber-200 pb-16">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-slate-200/70">
        <div className="max-w-[1180px] mx-auto px-5 md:px-8 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[17px] md:text-[19px] font-extrabold tracking-tight text-slate-900 leading-none">Escala de Lanche</h1>
              <p className="text-[12px] text-slate-500 font-medium -mt-0.5">Sincronizado na Nuvem • Feriados • Espalhado</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[12px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800">
              <Sun className="w-3.5 h-3.5" />
              Escolar
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100">
              {validDays.length} dias úteis
            </span>
            {holidays.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white">
                <CalendarOff className="w-3.5 h-3.5" />
                {holidays.length} feriados
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-5 md:px-8 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 md:gap-10 items-start">
        <div className="space-y-6 lg:sticky lg:top-[92px]">
          {/* TEACHER FORM */}
          <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-700" />
                </div>
                {editingTeacherId ? "Editar professor" : "Novo professor"}
              </h2>
              {editingTeacherId && (
                <button
                  onClick={() => {
                    setEditingTeacherId(null);
                    setTeacherName("");
                    setTeacherDays([]);
                    setTeacherTimes(2);
                  }}
                  className="text-[12px] font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
              )}
            </div>

            <label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-2 block">Nome do professor</label>
            <input
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Ex: Profa. Ana"
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-[14px] font-medium transition mb-4"
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-2 block">Vezes no mês</label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={teacherTimes}
                    onChange={(e) => setTeacherTimes(Number(e.target.value))}
                    className="w-full h-11 pl-8 pr-8 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-[14px] font-semibold appearance-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{n}x no mês</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1">
                  <TimerReset className="w-3 h-3" /> Regra folga
                </p>
                <p className="text-[11px] font-medium text-amber-900 leading-snug mt-1">1x por semana máx + 1 semana de intervalo.</p>
              </div>
            </div>

            <label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-2 block">Dias na escola</label>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {WEEKDAYS.map((w) => {
                const isSelected = teacherDays.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => handleToggleTeacherDay(w.id)}
                    className={`h-10 rounded-xl border text-[13px] font-semibold transition flex items-center justify-center gap-1.5
                      ${isSelected ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {w.short}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSaveTeacher}
              disabled={!teacherName.trim() || teacherDays.length === 0}
              className="w-full h-11 rounded-xl bg-[#1E3A8A] text-white font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1E40AF] transition shadow-[0_4px_12px_rgba(30,58,138,0.2)]"
            >
              <Plus className="w-4 h-4" /> {editingTeacherId ? "Salvar alterações" : "Adicionar professor"}
            </button>
          </div>

          {/* TEACHER LIST */}
          <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-slate-900">Professores cadastrados</h3>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{teachers.length}</span>
            </div>

            {teachers.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-3">
                  <Coffee className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-[13px] font-semibold text-slate-700">Nenhum professor ainda</p>
                <p className="text-[12px] text-slate-500 mt-1 max-w-[22ch] mx-auto">Adicione pelo menos 2 professores para gerar uma escala.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-auto pr-1 -mr-1">
                {teachers.map((t) => (
                  <div key={t.id} className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13.5px] font-semibold text-slate-900 truncate">{t.name}</p>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-900 text-white">{t.timesPerMonth}x</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {WEEKDAYS.map((w) => (
                          <span
                            key={w.id}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                              t.days.includes(w.id) ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-300"
                            }`}
                          >
                            {w.short}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                        {teacherCounts[t.id] || 0}/{t.timesPerMonth} • {t.days.length} dias disp.
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditTeacher(t)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-900 hover:text-white transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(t.id)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-red-600 hover:text-white hover:border-red-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* HOLIDAY SECTION */}
          <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-white">
                  <CalendarOff className="w-4 h-4" />
                </div>
                Feriados e Folgas
                <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{holidays.length}</span>
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <PartyPopper className="w-3 h-3" /> salvo na nuvem
              </span>
            </div>
            
            <p className="text-[12px] text-slate-500 mb-4 leading-snug">
              Dias cadastrados aqui são <span className="font-bold text-slate-700">ignorados totalmente</span> na escala e não contam como dia útil.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[150px_1fr_auto] gap-3 items-end">
              <div>
                <label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-1.5 block">Data</label>
                <input
                  type="date"
                  value={holidayDateStr}
                  onChange={(e) => setHolidayDateStr(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 outline-none text-[13px] font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-1.5 block">Nome do feriado</label>
                <input
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="Ex: Feriado Municipal"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 outline-none text-[13px] font-medium"
                />
              </div>
              <button
                onClick={handleAddHoliday}
                disabled={!holidayDateStr || !holidayName.trim()}
                className="h-10 px-4 rounded-xl bg-slate-900 text-white font-bold text-[13px] flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-black transition"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>

            {holidays.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-2 max-h-[180px] overflow-auto pr-1">
                {holidays.map((h) => {
                  const d = parseYYYYMMDD(h.dateStr);
                  return (
                    <div key={h.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center leading-none">
                          <span className="text-[9px] font-bold uppercase text-slate-400">
                            {d ? WEEKDAYS[JS_DAY_TO_APP_DAY[d.getDay()] ?? 0]?.short : ""}
                          </span>
                          <span className="text-[12px] font-bold">{d ? formatShortDate(d) : h.dateStr.slice(5)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 truncate">{h.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {d ? formatLongDate(d) : h.dateStr} • FERIADO - não entra na escala
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-red-600 hover:text-white hover:border-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                <p className="text-[12px] text-slate-500">Nenhum feriado cadastrado. Adicione para pular automaticamente.</p>
              </div>
            )}
          </div>

          {/* SCHEDULE GENERATOR CONTROLS */}
          <div className="bg-[#1E3A8A] rounded-[22px] p-5 md:p-6 text-white relative overflow-hidden shadow-[0_12px_32px_rgba(30,58,138,0.25)]">
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-[1px]"></div>
            <div className="absolute -right-6 -bottom-10 w-40 h-40 rounded-full bg-amber-300/30"></div>
            
            <div className="relative space-y-4">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-blue-200 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Regras exatas + espalhado
                </div>
                <h2 className="text-[22px] font-extrabold leading-tight">Gerar escala espalhada no mês</h2>
                <p className="text-[13px] text-blue-100/80 mt-1 max-w-[58ch]">
                  Apenas dias úteis válidos (Seg-Sex sem feriados). Distribuição por espaçamento ideal: totalDias / vezesNoMês para espalhar no mês inteiro.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className="text-[11px] font-bold tracking-widest uppercase text-blue-200 mb-1.5 block">Começa em</label>
                  <input
                    type="date"
                    value={appState.startDate}
                    onChange={(e) => handleUpdateAppState({ startDate: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl bg-white text-slate-900 text-[14px] font-semibold border-0 outline-none focus:ring-4 focus:ring-white/20"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold tracking-widest uppercase text-blue-200 mb-1.5 block">Vai até</label>
                  <input
                    type="date"
                    value={appState.endDate}
                    onChange={(e) => handleUpdateAppState({ endDate: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl bg-white text-slate-900 text-[14px] font-semibold border-0 outline-none focus:ring-4 focus:ring-white/20"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="h-11 px-5 rounded-xl bg-amber-300 text-[#1E3A8A] font-extrabold text-[14px] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-200 transition shadow-[0_4px_16px_rgba(251,191,36,0.35)]"
                  >
                    <UtensilsCrossed className="w-4 h-4" /> Gerar
                  </button>
                  {appState.isGenerated && schedules.length > 0 && (
                    <button
                      onClick={handleGenerate}
                      className="h-11 px-4 rounded-xl bg-white/15 text-white font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-white/25 transition border border-white/20"
                      title="Gera novamente com outra semente aleatória"
                    >
                      <Shuffle className="w-4 h-4" /> Espalhar melhor
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] font-medium">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10">
                  <Clock3 className="w-3.5 h-3.5" />
                  {validDays.length} dias úteis válidos
                </span>
                {holidays.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10">
                    <CalendarOff className="w-3.5 h-3.5" />
                    {holidays.length} feriados ignorados
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {weeks.length} semanas
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Espaçamento ideal
                </span>
                {!isDatesValid && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white font-bold">
                    Intervalo inválido
                  </span>
                )}
              </div>

              {unassignedSchedules.length > 0 && appState.isGenerated && (
                <div className="p-3 rounded-xl bg-amber-300/20 border border-amber-300/30 flex gap-2">
                  <TriangleAlert className="w-4 h-4 text-amber-200 shrink-0 mt-0.5" />
                  <p className="text-[12px] leading-snug text-amber-100">
                    Atenção: <span className="font-bold text-white">{unassignedSchedules.length} dia(s)</span> ficaram vazios por falta de professor elegível. Ajuste as datas, adicione professores ou aumente o limite x/mês.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SCHEDULE VIEW */}
          {appState.isGenerated && schedules.length > 0 ? (
            <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.04)] overflow-hidden print-card">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 md:px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-blue-700" /> 
                    {parseYYYYMMDD(appState.startDate) && parseYYYYMMDD(appState.endDate) 
                      ? `Escala de ${formatLongDate(parseYYYYMMDD(appState.startDate)!)} até ${formatLongDate(parseYYYYMMDD(appState.endDate)!)}`
                      : ""}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {weeks.length} semanas • {validDays.length} dias úteis válidos • {holidays.length} feriados pulados
                  </p>
                </div>
                <div className="flex items-center gap-2 no-print">
                  <button onClick={handleCopy} className="h-8 px-3 rounded-lg bg-slate-900 text-white text-[12px] font-bold flex items-center gap-1.5 hover:bg-slate-800">
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </button>
                  <button onClick={handleClearSchedule} className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-[12px] font-bold flex items-center gap-1.5 hover:bg-slate-50">
                    <Eraser className="w-3.5 h-3.5" /> Limpar
                  </button>
                </div>
              </div>

              {/* CALENDAR VISUAL */}
              <div className="px-5 md:px-6 py-5 bg-slate-50/80 border-b border-slate-100">
                <h4 className="text-[12px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4" /> Calendário visual • vazios, feriados e preenchidos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getCalendarMonths().map((mInfo) => {
                    const firstDay = new Date(mInfo.year, mInfo.month, 1);
                    const lastDay = new Date(mInfo.year, mInfo.month + 1, 0);
                    let startingDay = firstDay.getDay();
                    const daysInMonth = lastDay.getDate();
                    const blanks = startingDay === 0 ? 6 : startingDay - 1;
                    const slots = [];
                    for(let i=0; i<blanks; i++) slots.push(null);
                    for(let i=1; i<=daysInMonth; i++) slots.push(new Date(mInfo.year, mInfo.month, i));

                    return (
                      <div key={`${mInfo.year}-${mInfo.month}`} className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[13px] font-bold capitalize text-slate-900">{mInfo.label}</p>
                          <div className="flex items-center gap-1.5 text-[9px] font-bold">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span> preenchido
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span> feriado
                            <span className="w-2 h-2 rounded-full bg-amber-300"></span> vazio
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-[10px] font-bold uppercase text-slate-400 mb-1">
                          <span className="text-center">Seg</span><span className="text-center">Ter</span>
                          <span className="text-center">Qua</span><span className="text-center">Qui</span>
                          <span className="text-center">Sex</span><span className="text-center">Sáb</span>
                          <span className="text-center">Dom</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {slots.map((dayObj, idx) => {
                            if (!dayObj) return <div key={`empty-${idx}`} className="h-9"></div>;
                            const dStr = formatDateToYYYYMMDD(dayObj);
                            const isWeekend = dayObj.getDay() === 0 || dayObj.getDay() === 6;
                            const isHol = holidayMap.get(dStr);
                            const scheduleDay = schedules.find(s => s.dateStr === dStr);
                            const assignedTeacherId = scheduleDay?.teacherId;
                            const isValidDay = validDays.some(v => v.dateStr === dStr) && !assignedTeacherId;

                            let bgClass = "bg-white border-slate-200 text-slate-500";
                            if (isHol) bgClass = "bg-slate-800 text-white border-slate-800";
                            else if (assignedTeacherId) bgClass = "bg-blue-600 text-white border-blue-600";
                            else if (isValidDay) bgClass = "bg-amber-100 border-amber-200 text-amber-900";
                            else if (isWeekend) bgClass = "bg-slate-50 border-slate-100 text-slate-300";

                            const title = isHol ? `FERIADO - ${isHol.name}` : assignedTeacherId ? teachers.find(t=>t.id===assignedTeacherId)?.name : isValidDay ? "Vazio" : "";

                            return (
                              <div key={dStr} className={`h-9 rounded-lg border flex flex-col items-center justify-center leading-none text-[11px] font-semibold relative ${bgClass}`} title={title}>
                                <span className="text-[11px] font-bold">{dayObj.getDate()}</span>
                                {isHol && <span className="text-[7px] font-bold uppercase mt-0.5">FER</span>}
                                {assignedTeacherId && <span className="text-[8px] font-bold truncate max-w-[28px]">{teachers.find(t=>t.id===assignedTeacherId)?.name.split(" ").slice(-1)[0]?.slice(0, 3)}</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="divide-y divide-slate-100/80">
                {weeks.map((w) => {
                  return (
                    <div key={w.idx} className="p-5 md:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 px-3 items-center rounded-full bg-slate-900 text-white text-[12px] font-bold">{w.label}</span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {w.days.length} dias válidos
                          </span>
                        </div>
                      </div>

                      <div className="hidden md:grid grid-cols-5 gap-3">
                        {WEEKDAYS.map((wkDay) => {
                          const wDay: any = w.days.find((d: any) => d.dayId === wkDay.id);
                          if (!wDay) {
                            return (
                              <div key={wkDay.id} className="rounded-xl border border-dashed border-slate-200 p-3 min-h-[92px] bg-slate-50/60 flex flex-col justify-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{wkDay.short}</p>
                                <p className="text-[11px] text-slate-400 mt-1">fora do intervalo</p>
                              </div>
                            )
                          }
                          const sch = schedules.find(s => s.dateStr === wDay.dateStr);
                          const assignedT = sch?.teacherId ? teachers.find(x=>x.id===sch.teacherId) : null;
                          const eligibleTeachers = teachers.filter(t => t.days.includes(wDay.dayId));

                          return (
                            <div key={wDay.dateStr} className={`rounded-xl border p-2.5 min-h-[106px] flex flex-col gap-2 transition ${!assignedT ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm'}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">{wDay.formattedShort}</span>
                                <span className="text-[10px] font-bold uppercase text-slate-500">{wkDay.short}</span>
                              </div>

                              {assignedT ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-extrabold">
                                      {assignedT.name[0]?.toUpperCase()}
                                    </div>
                                    <span className="text-[12.5px] font-bold text-slate-900 leading-tight truncate">{assignedT.name}</span>
                                  </div>
                                  <div className="mt-auto relative">
                                    <select
                                      value={assignedT.id}
                                      onChange={(e) => handleAssignTeacher(wDay.dateStr, e.target.value || null)}
                                      className="w-full h-7 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium px-2 pr-6 appearance-none outline-none focus:border-blue-400"
                                    >
                                      {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} {t.days.includes(wDay.dayId) ? "" : "(indisp.)"} • {teacherCounts[t.id] || 0}/{t.timesPerMonth}</option>
                                      ))}
                                      <option value="">— vazio —</option>
                                    </select>
                                    <ChevronDown className="w-3 h-3 absolute right-2 top-2 pointer-events-none text-slate-400" />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1"><TriangleAlert className="w-3 h-3" /> Vazio</span>
                                  <p className="text-[10px] text-amber-700 leading-snug">Sem elegível</p>
                                  <div className="mt-auto relative">
                                    <select
                                      value=""
                                      onChange={(e) => handleAssignTeacher(wDay.dateStr, e.target.value || null)}
                                      className="w-full h-7 rounded-lg bg-white border border-amber-200 text-[11px] font-medium px-2 pr-6 appearance-none"
                                    >
                                      <option value="">Atribuir...</option>
                                      {eligibleTeachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} • {teacherCounts[t.id]||0}/{t.timesPerMonth}</option>
                                      ))}
                                    </select>
                                    <ChevronDown className="w-3 h-3 absolute right-2 top-2 pointer-events-none text-slate-400" />
                                  </div>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Resumo por Professor */}
              <div className="px-5 md:px-6 py-5 bg-slate-50 border-t border-slate-100 space-y-4">
                <h4 className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Resumo por professor • datas exatas</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {teachers.map(t => {
                    const dates = teacherDates[t.id] || [];
                    return (
                      <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-bold text-slate-900">{t.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(teacherCounts[t.id]||0)>t.timesPerMonth ? 'bg-red-100 text-red-700' : (teacherCounts[t.id]||0)===t.timesPerMonth ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {teacherCounts[t.id]||0}/{t.timesPerMonth}x
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1.5 leading-snug">
                          {dates.length ? dates.map((d: any) => `${d.formattedLong} (${WEEKDAYS[d.dayId].short})`).join(" • ") : <span className="text-slate-400">Nenhuma escala no intervalo</span>}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[20px] border border-dashed border-slate-300 p-8 md:p-12 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <CalendarDays className="w-6 h-6 text-blue-700" />
              </div>
              <h3 className="text-[15px] font-bold text-slate-900">Nenhuma escala gerada</h3>
              <p className="text-[13px] text-slate-500 mt-1 max-w-[42ch] mx-auto">
                Adicione professores, defina as datas de intervalo e clique em Gerar para criar a distribuição ideal para o mês.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
