
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState } from "@/contexts/app-provider";
import { User, AttendanceLog, WORK_SCHEDULE } from "@/lib/data";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  UserSearch,
  AlertTriangle,
  Edit,
  ChevronsUpDown,
  Check,
  PlusCircle,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  getDay,
  parse,
  max,
  min,
} from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { EditAttendanceLogDialog } from "@/components/admin/edit-attendance-log-dialog";

interface DailySummary {
  date: string;
  dayName: string;
  dayDate: Date;
  entries: (AttendanceLog & { time: string })[];
  totalHours: number;
  delayMinutes: number;
  overtimeHours: string; // Cambiado a string para mostrar HH:mm
  isAbsent: boolean;
}

const WEEK_START_ON = 1; // Lunes
const MAX_WEEKLY_HOURS = 44; // Jornada máxima legal en Chile (Ley 21.561)
const HOLIDAYS = [
  new Date(2025, 8, 18), // 18 de septiembre
  new Date(2025, 8, 19), // 19 de septiembre
  // Agrega más feriados según el calendario chileno
];

export default function AttendanceReportPage() {
  const { users, attendanceLogs, user: authUser } = useAppState();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<
    (Partial<AttendanceLog> & { forDate?: Date; forUser?: User }) | null
  >(null);
  const [isLoading, setIsLoading] = useState(false); // Feedback de carga

  const canEdit = useMemo(
    () => authUser?.role === "admin" || authUser?.role === "operations",
    [authUser]
  );
  const userMap = useMemo(
    () => new Map(users?.map((u) => [u.id, u.name]) ?? []),
    [users]
  );

  const weekInterval = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: WEEK_START_ON });
    const end = endOfWeek(selectedDate, { weekStartsOn: WEEK_START_ON });
    return { start, end };
  }, [selectedDate]);

  const weekDays = useMemo(() => eachDayOfInterval(weekInterval), [weekInterval]);

  const calculateDailySummary = useCallback(
    (logs: AttendanceLog[], day: Date): DailySummary => {
      const isHoliday = HOLIDAYS.some(
        (h) => h.toDateString() === day.toDateString()
      );
      const dayOfWeek = getDay(day);
      const isSaturday = dayOfWeek === 6;
      const isFriday = dayOfWeek === 5;

      if (!logs || logs.length === 0) {
        return {
          date: format(day, "dd/MM/yyyy"),
          dayName: isHoliday
            ? `${format(day, "EEEE", { locale: es })} (Feriado)`
            : format(day, "EEEE", { locale: es }),
          dayDate: day,
          entries: [],
          totalHours: 0,
          overtimeHours: "00:00",
          delayMinutes: 0,
          isAbsent: true,
        };
      }

      const startWork = parse("08:00", "HH:mm", day);
      const endWork = parse(isFriday ? "17:00" : "18:00", "HH:mm", day);
      const lunchStart = parse("13:00", "HH:mm", day);
      const lunchEnd = parse("14:00", "HH:mm", day);
      const lunchDurationMillis = lunchEnd.getTime() - lunchStart.getTime();

      let totalMillis = 0;
      let delayMinutes = 0;
      let overtimeMillis = 0;

      const entries = logs
        .filter((l) => l.timestamp)
        .map((l) => ({
          ...l,
          dateObj:
            l.timestamp instanceof Timestamp
              ? l.timestamp.toDate()
              : new Date(l.timestamp),
        }))
        .filter((l) => !isNaN(l.dateObj.getTime()))
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

      if (entries.length > 0) {
        const firstIn = entries[0];
        const lastOut = entries[entries.length - 1];

        if (isSaturday || isHoliday) {
          // Sábados y feriados: todo es hora extra, desde las 08:00
          const effectiveStart = max([firstIn.dateObj, startWork]);
          const workedMillis = lastOut.dateObj.getTime() - effectiveStart.getTime();
          overtimeMillis = Math.max(0, workedMillis);
        } else {
          // Lunes a viernes
          const effectiveStart = max([firstIn.dateObj, startWork]);
          if (firstIn.dateObj > startWork) {
            delayMinutes = Math.round(
              (firstIn.dateObj.getTime() - startWork.getTime()) / 60000
            );
          }
          const effectiveEnd = lastOut.dateObj;
          if (effectiveEnd > endWork) {
            overtimeMillis = Math.min(
              effectiveEnd.getTime() - endWork.getTime(),
              2 * 60 * 60 * 1000 // Máximo 2 horas diarias
            );
          }
          const workedMillis =
            effectiveEnd.getTime() - effectiveStart.getTime() - lunchDurationMillis;
          totalMillis = Math.max(0, workedMillis);
        }
      }

      // Convertir overtimeMillis a formato HH:mm
      const overtimeHours = Math.floor(overtimeMillis / (1000 * 60 * 60));
      const overtimeMinutes = Math.floor(
        (overtimeMillis % (1000 * 60 * 60)) / (1000 * 60)
      );
      const overtimeFormatted = `${overtimeHours
        .toString()
        .padStart(2, "0")}:${overtimeMinutes.toString().padStart(2, "0")}`;

      return {
        date: format(day, "dd/MM/yyyy"),
        dayName: isHoliday
          ? `${format(day, "EEEE", { locale: es })} (Feriado)`
          : format(day, "EEEE", { locale: es }),
        dayDate: day,
        entries: entries.map((l) => ({
          ...l,
          time: format(l.dateObj, "HH:mm"),
        })),
        totalHours: totalMillis / (1000 * 60 * 60),
        overtimeHours: overtimeFormatted,
        delayMinutes,
        isAbsent: logs.length === 0,
      };
    },
    []
  );

  const weeklyReport = useMemo((): DailySummary[] => {
    if (!selectedUserId || !users || !attendanceLogs) return [];

    setIsLoading(true);
    const userLogs = attendanceLogs.filter(
      (log) => log.userId === selectedUserId
    );

    const report = weekDays.map((day) => {
      const dayString = format(day, "yyyy-MM-dd");
      const logsForDay = userLogs
        .filter((log) => log.date === dayString)
        .sort(
          (a, b) =>
            (a.timestamp instanceof Timestamp
              ? a.timestamp.toDate()
              : new Date(a.timestamp)
            ).getTime() -
            (b.timestamp instanceof Timestamp
              ? b.timestamp.toDate()
              : new Date(b.timestamp)
            ).getTime()
        );
      return calculateDailySummary(logsForDay, day);
    });
    setIsLoading(false);
    return report;
  }, [selectedUserId, weekDays, attendanceLogs, users, calculateDailySummary]);

  const weeklyTotals = useMemo(() => {
    const totalHours = weeklyReport.reduce(
      (acc, day) => acc + day.totalHours,
      0
    );
    const totalDelays = weeklyReport.reduce(
      (acc, day) => acc + day.delayMinutes,
      0
    );
    const overtimeMillis = weeklyReport.reduce((acc, day) => {
      const [hours, minutes] = day.overtimeHours.split(":").map(Number);
      return acc + hours * 60 * 60 * 1000 + minutes * 60 * 1000;
    }, 0);
    const overtimeHours = Math.floor(overtimeMillis / (1000 * 60 * 60));
    const overtimeMinutes = Math.floor(
      (overtimeMillis % (1000 * 60 * 60)) / (1000 * 60)
    );
    const overtimeFormatted = `${overtimeHours
      .toString()
      .padStart(2, "0")}:${overtimeMinutes.toString().padStart(2, "0")}`;

    return { totalHours, totalDelays, overtimeHours: overtimeFormatted };
  }, [weeklyReport]);

  const selectedUser = useMemo(
    () => users?.find((u) => u.id === selectedUserId),
    [selectedUserId, users]
  );

  const handleAddNewEntry = useCallback(
    (day: DailySummary) => {
      if (!selectedUser) return;
      setEditingLog({
        forDate: day.dayDate,
        forUser: selectedUser,
      });
    },
    [selectedUser]
  );
  
  const formatHoursDecimal = (decimalHours: number) => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-8">
      {editingLog && (
        <EditAttendanceLogDialog
          log={editingLog}
          isOpen={!!editingLog}
          onClose={() => setEditingLog(null)}
        />
      )}

      <PageHeader
        title="Reporte Semanal de Asistencia"
        description="Selecciona un trabajador y una semana para ver el detalle de horas trabajadas, atrasos y horas extras (Ley 21.561 - 44 horas semanales)."
      />

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros del Reporte</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {/* Selector de trabajador */}
            <div>
              <label className="text-sm font-medium">Trabajador</label>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-label="Seleccionar trabajador"
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {selectedUserId
                        ? users?.find((u) => u.id === selectedUserId)?.name ??
                          "Selecciona un trabajador..."
                        : "Selecciona un trabajador..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar trabajador..." />
                    <CommandList>
                      <CommandEmpty>No se encontró el trabajador.</CommandEmpty>
                      <CommandGroup>
                        {users?.filter((u) => u.role !== "guardia").map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.name}
                            onSelect={() => {
                              setSelectedUserId(user.id);
                              setPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUserId === user.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {user.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Selector de semana */}
            <div>
              <label className="text-sm font-medium">Semana del</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    aria-label="Seleccionar semana"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(weekInterval.start, "dd 'de' MMM", { locale: es })} -{" "}
                    {format(weekInterval.end, "dd 'de' MMM, yyyy", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
              <p className="text-xl font-semibold">Cargando datos...</p>
            </div>
          </CardContent>
        </Card>
      ) : selectedUser ? (
        <>
          {/* Resumen semanal */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen Semanal de {selectedUser.name}</CardTitle>
              <CardDescription>
                Total de horas trabajadas, atrasos y horas extras para la semana seleccionada.
                {weeklyTotals.totalHours > MAX_WEEKLY_HOURS && (
                  <span className="text-red-500">
                    {" "}
                    ¡Advertencia! Las horas trabajadas exceden el límite legal de 44 horas semanales.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Horas Trabajadas</p>
                <p className="text-3xl font-bold">
                  {formatHoursDecimal(weeklyTotals.totalHours)}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Minutos de Atraso</p>
                <p className="text-3xl font-bold text-amber-500">
                  {weeklyTotals.totalDelays}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Horas Extras</p>
                <p className="text-3xl font-bold text-green-500">
                  {weeklyTotals.overtimeHours}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Detalle diario */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle Diario</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[50vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Día</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead className="text-right">Atraso (min)</TableHead>
                      <TableHead className="text-right">Horas</TableHead>
                      <TableHead className="text-right">Extras</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyReport.map((day) => (
                      <TableRow
                        key={day.date}
                        className={day.isAbsent ? "bg-muted/30" : ""}
                      >
                        <TableCell className="font-medium capitalize">
                          {day.dayName}
                        </TableCell>
                        <TableCell>{day.date}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            {day.isAbsent ? (
                              <span className="text-muted-foreground text-xs">
                                Ausente
                              </span>
                            ) : (
                              day.entries.map((e, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <span
                                    className={
                                      e.type === "in"
                                        ? "text-green-400"
                                        : "text-red-400"
                                    }
                                  >
                                    {e.time}
                                  </span>
                                  {e.modifiedAt && e.modifiedBy && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <AlertTriangle
                                            className="h-3 w-3 text-yellow-400"
                                            aria-label="Registro modificado"
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>
                                            Original:{" "}
                                            {e.originalTimestamp
                                              ? format(
                                                  e.originalTimestamp instanceof Timestamp
                                                    ? e.originalTimestamp.toDate()
                                                    : new Date(e.originalTimestamp),
                                                  "HH:mm"
                                                )
                                              : "N/A"}
                                          </p>
                                          <p>
                                            Modificado por:{" "}
                                            {userMap.get(e.modifiedBy) ??
                                              "Desconocido"}
                                          </p>
                                          <p>
                                            Fecha mod:{" "}
                                            {format(
                                              e.modifiedAt instanceof Timestamp
                                                ? e.modifiedAt.toDate()
                                                : new Date(e.modifiedAt),
                                              "dd/MM/yy HH:mm"
                                            )}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  {canEdit && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => setEditingLog(e)}
                                      aria-label="Editar registro"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))
                            )}
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 ml-2"
                                onClick={() => handleAddNewEntry(day)}
                                aria-label="Agregar nuevo registro"
                              >
                                <PlusCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {day.delayMinutes > 0 ? (
                            <span className="text-amber-500 font-bold">
                              {day.delayMinutes}
                            </span>
                          ) : (
                            "0"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatHoursDecimal(day.totalHours)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {day.overtimeHours}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
              <UserSearch className="h-16 w-16 mb-4" />
              <h3 className="text-xl font-semibold">Selecciona un Trabajador</h3>
              <p className="mt-2">
                Elige un trabajador del menú de arriba para generar su reporte de
                asistencia.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
