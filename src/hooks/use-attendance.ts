"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAppState } from "@/contexts/app-provider";
import { AttendanceLog, WORK_SCHEDULE } from "@/lib/data";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parse,
  max,
  min,
  isSameDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";

const HOLIDAYS: Date[] = [
  new Date(2025, 8, 18),
  new Date(2025, 8, 19),
];

interface DailySummary {
  date: string;
  dayName: string;
  dayDate: Date;
  entries: (AttendanceLog & { time: string; dateObj: Date })[];
  totalHours: number;
  delayMinutes: number;
  overtimeHours: string;
  isAbsent: boolean;
  isBusinessDay: boolean;
}

const calculateDailySummary = (logs: AttendanceLog[], day: Date): DailySummary => {
  const dayOfWeek = getDay(day);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = HOLIDAYS.some((h) => isSameDay(h, day));
  const isBusinessDay = !isWeekend && !isHoliday;

  const entries = logs
    .filter((l) => l.timestamp)
    .map((l) => ({
      ...l,
      dateObj:
        l.timestamp instanceof Timestamp ? l.timestamp.toDate() : new Date(l.timestamp),
    }))
    .filter((l) => !isNaN(l.dateObj.getTime()))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  if (!isBusinessDay || entries.length === 0) {
    return {
      date: format(day, "dd/MM/yyyy"),
      dayName: format(day, "EEEE", { locale: es }),
      dayDate: day,
      entries: [],
      totalHours: 0,
      overtimeHours: "00:00",
      delayMinutes: 0,
      isAbsent: isBusinessDay,
      isBusinessDay,
    };
  }
  
  const isFriday = dayOfWeek === 5;
  const startWorkTime = parse(WORK_SCHEDULE.weekdays.start, "HH:mm", day);
  const endWorkTime = parse(
    isFriday ? WORK_SCHEDULE.friday.end : WORK_SCHEDULE.weekdays.end,
    "HH:mm",
    day
  );
  const lunchStartTime = parse(WORK_SCHEDULE.lunchBreak.start, "HH:mm", day);
  const lunchEndTime = parse(WORK_SCHEDULE.lunchBreak.end, "HH:mm", day);

  let totalMillis = 0;
  let delayMinutes = 0;
  let overtimeMillis = 0;

  const effectiveStart = max([entries[0].dateObj, startWorkTime]);
  const lastOut = entries[entries.length - 1];

  if (entries[0].dateObj > startWorkTime) {
    delayMinutes = Math.round(
      (entries[0].dateObj.getTime() - startWorkTime.getTime()) / 60000
    );
  }

  if (lastOut.dateObj > endWorkTime) {
    overtimeMillis = Math.min(
      lastOut.dateObj.getTime() - endWorkTime.getTime(),
      2 * 60 * 60 * 1000
    );
  }
  
  let morningMillis = 0;
  let afternoonMillis = 0;
  
  if (entries.length >= 2) {
      const firstIn = entries[0].dateObj;
      let lunchOut = entries.find((e, i) => e.type === 'out' && i > 0)?.dateObj;
      let lunchIn = entries.find((e, i) => e.type === 'in' && i > 1)?.dateObj;
      const lastOutEntry = entries[entries.length - 1].dateObj;

      const morningStart = max([firstIn, startWorkTime]);
      const morningEnd = min([lunchOut || lastOutEntry, lunchStartTime]);
      
      if(morningEnd > morningStart) {
          morningMillis = morningEnd.getTime() - morningStart.getTime();
      }

      if(lunchIn && lastOutEntry > lunchIn) {
        const afternoonStart = max([lunchIn, lunchEndTime]);
        if(lastOutEntry > afternoonStart) {
           afternoonMillis = lastOutEntry.getTime() - afternoonStart.getTime();
        }
      } else if (!lunchIn && lastOutEntry > lunchEndTime) {
         // No explicit lunch break, but worked in the afternoon
         const afternoonStart = max([firstIn, lunchEndTime]);
         if(lastOutEntry > afternoonStart) {
            afternoonMillis = lastOutEntry.getTime() - afternoonStart.getTime();
         }
      }
  }


  totalMillis = Math.max(0, morningMillis) + Math.max(0, afternoonMillis);

  const overtimeHours = Math.floor(overtimeMillis / (1000 * 60 * 60));
  const overtimeMinutes = Math.floor(
    (overtimeMillis % (1000 * 60 * 60)) / (1000 * 60)
  );

  return {
    date: format(day, "dd/MM/yyyy"),
    dayName: format(day, "EEEE", { locale: es }),
    dayDate: day,
    entries: entries.map((l) => ({ ...l, time: format(l.dateObj, "HH:mm") })),
    totalHours: totalMillis / (1000 * 60 * 60),
    overtimeHours: `${String(overtimeHours).padStart(2, "0")}:${String(overtimeMinutes).padStart(2, "0")}`,
    delayMinutes,
    isAbsent: false,
    isBusinessDay,
  };
};

export function useMonthlyAttendance(
  userId: string | null,
  year: number,
  month: number
) {
  const { attendanceLogs } = useAppState();
  const [loading, setLoading] = useState(false);

  const report = useMemo(() => {
    if (!userId) return null;
    setLoading(true);

    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    const monthDays = eachDayOfInterval({ start, end });

    const userLogs = attendanceLogs.filter(
      (log) =>
        log.userId === userId &&
        new Date(log.timestamp as Date) >= start &&
        new Date(log.timestamp as Date) <= end
    );

    const dailySummaries = monthDays.map((day) => {
      const logsForDay = userLogs.filter((log) =>
        isSameDay(new Date(log.timestamp as Date), day)
      );
      return calculateDailySummary(logsForDay, day);
    });
    
    const totalBusinessDays = dailySummaries.filter(d => d.isBusinessDay).length;
    const workedDays = dailySummaries.filter(d => d.isBusinessDay && !d.isAbsent).length;
    const absentDays = totalBusinessDays - workedDays;
    const totalDelayMinutes = dailySummaries.reduce((acc, day) => acc + day.delayMinutes, 0);
    
    const formatHoursDecimal = (decimalHours: number) => {
        const hours = Math.floor(decimalHours);
        const minutes = Math.round((decimalHours - hours) * 60);
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }

    const totalWorkedHoursDecimal = dailySummaries.reduce((acc, day) => acc + day.totalHours, 0);

    const overtimeMillis = dailySummaries.reduce((acc, day) => {
      const [hours, minutes] = day.overtimeHours.split(":").map(Number);
      return acc + hours * 60 * 60 * 1000 + minutes * 60 * 1000;
    }, 0);
    const overtimeHours = Math.floor(overtimeMillis / (1000 * 60 * 60));
    const overtimeMinutes = Math.floor((overtimeMillis % (1000 * 60 * 60)) / (1000 * 60));


    const result = {
      period: { start, end },
      dailySummaries,
      summary: {
        totalBusinessDays,
        workedDays,
        absentDays,
        totalDelayMinutes,
        totalWorkedHours: formatHoursDecimal(totalWorkedHoursDecimal),
        totalOvertimeHours: `${String(overtimeHours).padStart(2, "0")}:${String(overtimeMinutes).padStart(2, "0")}`,
      },
    };
    
    setLoading(false);
    return result;
  }, [userId, year, month, attendanceLogs]);

  return { report, loading };
}