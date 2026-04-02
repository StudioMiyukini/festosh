import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  CheckSquare,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { Meeting } from '@/types/meeting';
import type { Task } from '@/types/task';

type CalendarItem =
  | { type: 'meeting'; data: Meeting }
  | { type: 'task'; data: Task };

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function formatDate(ts: number) {
  const d = new Date(ts * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toDateKey(ts: number) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function AdminAgendaPage() {
  const { festival } = useTenantStore();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);
    try {
      const [meetingsRes, tasksRes] = await Promise.all([
        api.get<Meeting[]>(`/meetings/festival/${festival.id}`),
        api.get<Task[]>(`/tasks/festival/${festival.id}`),
      ]);
      if (meetingsRes.success) setMeetings(meetingsRes.data || []);
      if (tasksRes.success) setTasks(tasksRes.data || []);
    } catch {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [festival]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build calendar items indexed by date key
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    for (const m of meetings) {
      if (!m.scheduled_at) continue;
      const key = toDateKey(m.scheduled_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ type: 'meeting', data: m });
    }

    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = t.due_date; // Already ISO date
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ type: 'task', data: t });
    }

    return map;
  }, [meetings, tasks]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Items for selected date
  const selectedItems = selectedDate ? itemsByDate.get(selectedDate) || [] : [];

  if (!festival) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Aucun festival selectionne</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Agenda</h2>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble des reunions et taches planifiees
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          {/* Calendar Grid */}
          <div className="rounded-lg border bg-card">
            {/* Calendar Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-md p-1.5 hover:bg-accent"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">
                  {MONTHS[currentMonth]} {currentYear}
                </h3>
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-md px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  Aujourd'hui
                </button>
              </div>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-md p-1.5 hover:bg-accent"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b">
              {WEEKDAYS.map((day) => (
                <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] border-b border-r bg-muted/20 p-1" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const items = itemsByDate.get(dateKey) || [];
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;
                const meetingCount = items.filter((it) => it.type === 'meeting').length;
                const taskCount = items.filter((it) => it.type === 'task').length;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDate(dateKey)}
                    className={`min-h-[80px] border-b border-r p-1 text-left transition-colors hover:bg-accent/50 ${
                      isSelected ? 'bg-primary/10 ring-1 ring-primary' : ''
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground'
                      }`}
                    >
                      {day}
                    </span>
                    {items.length > 0 && (
                      <div className="mt-0.5 flex flex-col gap-0.5">
                        {meetingCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium text-blue-700">
                            <Users className="h-2.5 w-2.5" />
                            {meetingCount}
                          </span>
                        )}
                        {taskCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">
                            <CheckSquare className="h-2.5 w-2.5" />
                            {taskCount}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar: Selected date details */}
          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold text-foreground">
                {selectedDate
                  ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : "Selectionnez une date"}
              </h3>
            </div>

            <div className="max-h-[500px] overflow-y-auto p-4">
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground">
                  Cliquez sur un jour du calendrier pour voir les details
                </p>
              ) : selectedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun evenement pour cette date
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((item) => {
                    if (item.type === 'meeting') {
                      const m = item.data;
                      return (
                        <div
                          key={`m-${m.id}`}
                          className="rounded-lg border bg-blue-50/50 p-3 space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm">{m.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {m.scheduled_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(m.scheduled_at)} ({m.duration_minutes} min)
                              </span>
                            )}
                            {m.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {m.location}
                              </span>
                            )}
                          </div>
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[m.status] || ''}`}>
                            {m.status === 'planned' ? 'Planifiee' :
                             m.status === 'in_progress' ? 'En cours' :
                             m.status === 'completed' ? 'Terminee' : 'Annulee'}
                          </span>
                        </div>
                      );
                    }

                    const t = item.data;
                    return (
                      <div
                        key={`t-${t.id}`}
                        className="rounded-lg border bg-amber-50/50 p-3 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-amber-600" />
                          <span className={`font-medium text-sm ${t.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                            {t.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[t.priority] || ''}`}>
                            {t.priority === 'low' ? 'Basse' :
                             t.priority === 'medium' ? 'Moyenne' :
                             t.priority === 'high' ? 'Haute' : 'Urgente'}
                          </span>
                          {t.assignee_name && (
                            <span className="text-xs text-muted-foreground">
                              → {t.assignee_name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
