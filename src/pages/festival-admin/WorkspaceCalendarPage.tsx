import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  Trash2,
  Clock,
  MapPin,
  Bell,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkspaceCalendar {
  id: string;
  name: string;
  color: string;
  festival_id: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  calendar_id: string;
  color: string | null;
  reminder: string | null;
}

type ViewMode = 'month' | 'week';
type ReminderOption = 'none' | '5min' | '15min' | '30min' | '1h' | '1day';

// ─── Constants ──────────────────────────────────────────────────────────────

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_NAMES = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

const REMINDER_LABELS: Record<ReminderOption, string> = {
  none: 'Aucun',
  '5min': '5 minutes avant',
  '15min': '15 minutes avant',
  '30min': '30 minutes avant',
  '1h': '1 heure avant',
  '1day': '1 jour avant',
};

const DEFAULT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
];

const WEEK_HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8h-22h

// ─── Date Helpers ───────────────────────────────────────────────────────────

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const result = new Date(s);
  result.setDate(s.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function formatISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const firstDow = first.getDay() === 0 ? 6 : first.getDay() - 1; // Monday=0
  const startDate = new Date(year, month, 1 - firstDow);

  const weeks: Date[][] = [];
  const cursor = new Date(startDate);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    // stop if first day of next week row is in a subsequent month (beyond needed)
    if (cursor.getMonth() > month && cursor.getDate() > 7) break;
  }
  return weeks;
}

function getWeekDays(refDate: Date): Date[] {
  const s = startOfWeek(refDate);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(s);
    d.setDate(s.getDate() + i);
    return d;
  });
}

// ─── Event Dialog ───────────────────────────────────────────────────────────

function EventDialog({
  event,
  calendars,
  defaultDate,
  onSave,
  onDelete,
  onClose,
}: {
  event: CalendarEvent | null;
  calendars: WorkspaceCalendar[];
  defaultDate: Date | null;
  onSave: (data: Partial<CalendarEvent>) => void;
  onDelete: ((id: string) => void) | null;
  onClose: () => void;
}) {
  const isEdit = !!event;
  const defaultStart = defaultDate || new Date();
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [location, setLocation] = useState(event?.location || '');
  const [startTime, setStartTime] = useState(
    event ? formatDateTimeLocal(new Date(event.start_time)) : formatDateTimeLocal(defaultStart)
  );
  const [endTime, setEndTime] = useState(
    event ? formatDateTimeLocal(new Date(event.end_time)) : formatDateTimeLocal(defaultEnd)
  );
  const [allDay, setAllDay] = useState(event?.all_day || false);
  const [calendarId, setCalendarId] = useState(event?.calendar_id || calendars[0]?.id || '');
  const [color, setColor] = useState(event?.color || '');
  const [reminder, setReminder] = useState<ReminderOption>((event?.reminder as ReminderOption) || 'none');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    const data: Partial<CalendarEvent> = {
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      start_time: allDay ? formatISO(new Date(startTime)) + 'T00:00:00' : new Date(startTime).toISOString(),
      end_time: allDay ? formatISO(new Date(endTime)) + 'T23:59:59' : new Date(endTime).toISOString(),
      all_day: allDay,
      calendar_id: calendarId,
      color: color || null,
      reminder: reminder === 'none' ? null : reminder,
    };

    if (isEdit && event) {
      data.id = event.id;
    }

    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Modifier l\'evenement' : 'Nouvel evenement'}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Titre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Titre de l'evenement"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Description (optionnel)"
            />
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
              <MapPin className="h-3.5 w-3.5" />
              Lieu
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Lieu (optionnel)"
            />
          </div>

          {/* All day toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="allDay" className="text-sm font-medium text-gray-700">
              Toute la journee
            </label>
          </div>

          {/* Date / Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                <Clock className="h-3.5 w-3.5" />
                Debut
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? startTime.slice(0, 10) : startTime}
                onChange={(e) => setStartTime(allDay ? e.target.value + 'T00:00' : e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                <Clock className="h-3.5 w-3.5" />
                Fin
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? endTime.slice(0, 10) : endTime}
                onChange={(e) => setEndTime(allDay ? e.target.value + 'T23:59' : e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Calendar selector */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
              <CalendarIcon className="h-3.5 w-3.5" />
              Calendrier
            </label>
            <select
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>{cal.name}</option>
              ))}
            </select>
          </div>

          {/* Color picker */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Couleur (optionnel)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setColor('')}
                className={`h-7 w-7 rounded-full border-2 ${
                  !color ? 'border-blue-500' : 'border-gray-200'
                } bg-gray-100 text-xs text-gray-400 flex items-center justify-center`}
              >
                <X className="h-3 w-3" />
              </button>
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${
                    color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
              <Bell className="h-3.5 w-3.5" />
              Rappel
            </label>
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value as ReminderOption)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {(Object.keys(REMINDER_LABELS) as ReminderOption[]).map((opt) => (
                <option key={opt} value={opt}>{REMINDER_LABELS[opt]}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            {isEdit && onDelete && event ? (
              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function WorkspaceCalendarPage() {
  const { festival } = useTenantStore();
  const festivalId = festival?.id;

  const [calendars, setCalendars] = useState<WorkspaceCalendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visibleCalendars, setVisibleCalendars] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [defaultDialogDate, setDefaultDialogDate] = useState<Date | null>(null);

  // ─── Load calendars ──────────────────────────────────────────────────

  const loadCalendars = useCallback(async () => {
    if (!festivalId) return;
    const res = await api.get<WorkspaceCalendar[]>(
      `/workspace-calendar/festival/${festivalId}`
    );
    if (res.success && res.data) {
      setCalendars(res.data);
      setVisibleCalendars(new Set(res.data.map((c) => c.id)));
    }
  }, [festivalId]);

  // ─── Load events ─────────────────────────────────────────────────────

  const loadEvents = useCallback(async () => {
    if (!festivalId) return;
    let rangeStart: Date;
    let rangeEnd: Date;
    if (viewMode === 'month') {
      rangeStart = startOfMonth(currentDate);
      // Extend to include partial weeks
      const dow = rangeStart.getDay() === 0 ? 6 : rangeStart.getDay() - 1;
      rangeStart = new Date(rangeStart);
      rangeStart.setDate(rangeStart.getDate() - dow);
      rangeEnd = endOfMonth(currentDate);
      const endDow = rangeEnd.getDay() === 0 ? 0 : 7 - rangeEnd.getDay();
      rangeEnd.setDate(rangeEnd.getDate() + endDow);
    } else {
      rangeStart = startOfWeek(currentDate);
      rangeEnd = endOfWeek(currentDate);
    }
    const res = await api.get<CalendarEvent[]>(
      `/workspace-calendar/festival/${festivalId}/events?start=${rangeStart.toISOString()}&end=${rangeEnd.toISOString()}`
    );
    if (res.success && res.data) {
      setEvents(res.data);
      setError(null);
    } else {
      setError(res.error || 'Impossible de charger les evenements');
    }
    setLoading(false);
  }, [festivalId, currentDate, viewMode]);

  useEffect(() => {
    loadCalendars();
  }, [loadCalendars]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // ─── Navigation ──────────────────────────────────────────────────────

  const goToday = () => setCurrentDate(new Date());

  const goPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setCurrentDate(d);
  };

  const goNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setCurrentDate(d);
  };

  // ─── Toggle calendar visibility ──────────────────────────────────────

  const toggleCalendar = (calId: string) => {
    setVisibleCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(calId)) {
        next.delete(calId);
      } else {
        next.add(calId);
      }
      return next;
    });
  };

  // ─── Filtered events ────────────────────────────────────────────────

  const filteredEvents = useMemo(
    () => events.filter((ev) => visibleCalendars.has(ev.calendar_id)),
    [events, visibleCalendars]
  );

  // ─── Event color resolver ───────────────────────────────────────────

  const getEventColor = useCallback(
    (ev: CalendarEvent): string => {
      if (ev.color) return ev.color;
      const cal = calendars.find((c) => c.id === ev.calendar_id);
      return cal?.color || '#3B82F6';
    },
    [calendars]
  );

  // ─── Events for a given day ─────────────────────────────────────────

  const eventsForDay = useCallback(
    (day: Date) =>
      filteredEvents.filter((ev) => {
        const evStart = new Date(ev.start_time);
        const evEnd = new Date(ev.end_time);
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        return evStart <= dayEnd && evEnd >= dayStart;
      }),
    [filteredEvents]
  );

  // ─── Dialog handlers ────────────────────────────────────────────────

  const openCreateDialog = (date?: Date) => {
    setEditingEvent(null);
    setDefaultDialogDate(date || new Date());
    setDialogOpen(true);
  };

  const openEditDialog = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setDefaultDialogDate(null);
    setDialogOpen(true);
  };

  const handleSave = async (data: Partial<CalendarEvent>) => {
    if (data.id) {
      await api.put(`/workspace-calendar/events/${data.id}`, data);
    } else {
      await api.post(`/workspace-calendar/events`, data);
    }
    setDialogOpen(false);
    setEditingEvent(null);
    loadEvents();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/workspace-calendar/events/${id}`);
    setDialogOpen(false);
    setEditingEvent(null);
    loadEvents();
  };

  // ─── Render helpers ──────────────────────────────────────────────────

  const monthGrid = useMemo(
    () => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // ─── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ─── Top bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Calendrier</h1>

        <div className="ml-4 flex items-center gap-1 rounded-md border border-gray-300">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 text-sm font-medium ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            } rounded-l-md`}
          >
            Mois
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-sm font-medium ${
              viewMode === 'week'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            } rounded-r-md`}
          >
            Semaine
          </button>
        </div>

        <button
          onClick={goToday}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Aujourd'hui
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[160px] text-center text-sm font-medium text-gray-800">
            {viewMode === 'month'
              ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              : `Semaine du ${weekDays[0].getDate()} ${MONTH_NAMES[weekDays[0].getMonth()].slice(0, 3)} - ${weekDays[6].getDate()} ${MONTH_NAMES[weekDays[6].getMonth()].slice(0, 3)} ${weekDays[6].getFullYear()}`}
          </span>
          <button
            onClick={goNext}
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={() => openCreateDialog()}
          className="ml-auto flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nouvel evenement
        </button>
      </div>

      {/* ─── Content ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Calendar sidebar */}
        <div className="w-52 flex-shrink-0 border-r border-gray-200 bg-gray-50 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Calendriers</h3>
          {calendars.length === 0 && (
            <p className="text-xs text-gray-400">Aucun calendrier</p>
          )}
          {calendars.map((cal) => (
            <label
              key={cal.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-100"
            >
              <input
                type="checkbox"
                checked={visibleCalendars.has(cal.id)}
                onChange={() => toggleCalendar(cal.id)}
                className="h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
                style={{ accentColor: cal.color }}
              />
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: cal.color }}
              />
              <span className="truncate text-sm text-gray-700">{cal.name}</span>
            </label>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-auto">
          {error && (
            <div className="mx-4 mt-3 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {viewMode === 'month' ? (
            /* ── Month View ─────────────────────────────────────────── */
            <div className="flex h-full flex-col">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {DAY_NAMES.map((name) => (
                  <div
                    key={name}
                    className="border-r border-gray-200 px-2 py-2 text-center text-xs font-semibold uppercase text-gray-500 last:border-r-0"
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              <div className="grid flex-1 auto-rows-fr">
                {monthGrid.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
                    {week.map((day, di) => {
                      const inMonth = day.getMonth() === currentDate.getMonth();
                      const dayEvents = eventsForDay(day);
                      const today = isToday(day);
                      return (
                        <div
                          key={di}
                          className={`group relative min-h-[80px] border-r border-gray-200 p-1 last:border-r-0 cursor-pointer hover:bg-blue-50/30 ${
                            inMonth ? 'bg-white' : 'bg-gray-50'
                          }`}
                          onClick={() => openCreateDialog(day)}
                        >
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                              today
                                ? 'bg-blue-600 font-bold text-white'
                                : inMonth
                                ? 'font-medium text-gray-900'
                                : 'text-gray-400'
                            }`}
                          >
                            {day.getDate()}
                          </span>

                          <div className="mt-0.5 space-y-0.5">
                            {dayEvents.slice(0, 3).map((ev) => (
                              <div
                                key={ev.id}
                                onClick={(e) => { e.stopPropagation(); openEditDialog(ev); }}
                                className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white cursor-pointer hover:opacity-80"
                                style={{ backgroundColor: getEventColor(ev) }}
                                title={ev.title}
                              >
                                {ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="px-1.5 text-[10px] font-medium text-gray-500">
                                +{dayEvents.length - 3} de plus
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── Week View ──────────────────────────────────────────── */
            <div className="flex h-full flex-col">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50">
                <div className="border-r border-gray-200" />
                {weekDays.map((day, i) => {
                  const today = isToday(day);
                  return (
                    <div
                      key={i}
                      className={`border-r border-gray-200 px-2 py-2 text-center last:border-r-0 ${
                        today ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="text-xs font-semibold uppercase text-gray-500">
                        {DAY_NAMES[i]}
                      </div>
                      <div
                        className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                          today ? 'bg-blue-600 font-bold text-white' : 'font-medium text-gray-900'
                        }`}
                      >
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hour rows */}
              <div className="flex-1 overflow-auto">
                <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
                  {WEEK_HOURS.map((hour) => (
                    <div key={hour} className="contents">
                      {/* Hour label */}
                      <div className="flex h-14 items-start justify-end border-b border-r border-gray-200 pr-2 pt-0.5 text-xs text-gray-400">
                        {String(hour).padStart(2, '0')}:00
                      </div>
                      {/* Day cells */}
                      {weekDays.map((day, di) => (
                        <div
                          key={di}
                          className="relative h-14 border-b border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-blue-50/20"
                          onClick={() => {
                            const d = new Date(day);
                            d.setHours(hour, 0, 0, 0);
                            openCreateDialog(d);
                          }}
                        />
                      ))}
                    </div>
                  ))}

                  {/* Event blocks overlaid */}
                  {weekDays.map((day, dayIdx) => {
                    const dayEvts = eventsForDay(day).filter((ev) => !ev.all_day);
                    return dayEvts.map((ev) => {
                      const evStart = new Date(ev.start_time);
                      const evEnd = new Date(ev.end_time);
                      const startHour = evStart.getHours() + evStart.getMinutes() / 60;
                      const endHour = evEnd.getHours() + evEnd.getMinutes() / 60;
                      const clampedStart = Math.max(startHour, 8);
                      const clampedEnd = Math.min(endHour, 22);
                      if (clampedEnd <= clampedStart) return null;

                      const topPx = (clampedStart - 8) * 56; // 56px = h-14
                      const heightPx = (clampedEnd - clampedStart) * 56;
                      // Position: skip first column (60px), then offset by dayIdx
                      // The grid makes this tricky, so we use absolute positioning
                      const leftPercent = ((dayIdx) / 7) * 100;
                      const widthPercent = 100 / 7;

                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); openEditDialog(ev); }}
                          className="absolute z-10 mx-0.5 overflow-hidden rounded px-1.5 py-0.5 text-[11px] font-medium text-white cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: getEventColor(ev),
                            top: `${topPx}px`,
                            height: `${Math.max(heightPx, 20)}px`,
                            left: `calc(60px + ${leftPercent}%)`,
                            width: `calc(${widthPercent}% - 4px)`,
                          }}
                          title={ev.title}
                        >
                          <div className="truncate">{ev.title}</div>
                          {heightPx > 30 && (
                            <div className="truncate text-[10px] opacity-80">
                              {String(evStart.getHours()).padStart(2, '0')}:{String(evStart.getMinutes()).padStart(2, '0')} - {String(evEnd.getHours()).padStart(2, '0')}:{String(evEnd.getMinutes()).padStart(2, '0')}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Event Dialog ─────────────────────────────────────────────── */}
      {dialogOpen && (
        <EventDialog
          event={editingEvent}
          calendars={calendars}
          defaultDate={defaultDialogDate}
          onSave={handleSave}
          onDelete={editingEvent ? handleDelete : null}
          onClose={() => { setDialogOpen(false); setEditingEvent(null); }}
        />
      )}
    </div>
  );
}
