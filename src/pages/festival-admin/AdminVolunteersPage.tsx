import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Users,
  Clock,
  Calendar,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  MapPin,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { VolunteerRole, Shift, ShiftAssignment } from '@/types/volunteer';
import type { Venue } from '@/types/programming';

export function AdminVolunteersPage() {
  const { festival, activeEdition } = useTenantStore();

  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Role create dialog
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDescription, setRoleFormDescription] = useState('');
  const [roleFormColor, setRoleFormColor] = useState('#6366f1');
  const [creatingRole, setCreatingRole] = useState(false);

  // Shift create dialog
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [shiftFormTitle, setShiftFormTitle] = useState('');
  const [shiftFormDescription, setShiftFormDescription] = useState('');
  const [shiftFormRoleId, setShiftFormRoleId] = useState('');
  const [shiftFormVenueId, setShiftFormVenueId] = useState('');
  const [shiftFormStartTime, setShiftFormStartTime] = useState('');
  const [shiftFormEndTime, setShiftFormEndTime] = useState('');
  const [shiftFormMaxVolunteers, setShiftFormMaxVolunteers] = useState('4');
  const [creatingShift, setCreatingShift] = useState(false);

  // View assignments
  const [viewingShiftId, setViewingShiftId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);

    const [rolesRes, shiftsRes, assignmentsRes, venuesRes] = await Promise.all([
      api.get<VolunteerRole[]>(`/volunteers/festival/${festival.id}/roles`),
      api.get<Shift[]>(`/volunteers/festival/${festival.id}/shifts`),
      api.get<ShiftAssignment[]>(`/volunteers/festival/${festival.id}/assignments`),
      api.get<Venue[]>(`/venues/festival/${festival.id}`),
    ]);

    if (rolesRes.success && rolesRes.data) setRoles(rolesRes.data);
    if (shiftsRes.success && shiftsRes.data) setShifts(shiftsRes.data);
    else setError(shiftsRes.error || 'Impossible de charger les donnees.');
    if (assignmentsRes.success && assignmentsRes.data) setAssignments(assignmentsRes.data);
    if (venuesRes.success && venuesRes.data) setVenues(venuesRes.data);

    setLoading(false);
  }, [festival]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateRole = async () => {
    if (!festival || !roleFormName.trim()) return;
    setCreatingRole(true);
    setMessage(null);

    const res = await api.post<VolunteerRole>(`/volunteers/festival/${festival.id}/roles`, {
      name: roleFormName.trim(),
      description: roleFormDescription.trim() || null,
      color: roleFormColor,
    });

    if (res.success && res.data) {
      setRoles((prev) => [...prev, res.data!]);
      setShowRoleDialog(false);
      setRoleFormName('');
      setRoleFormDescription('');
      setRoleFormColor('#6366f1');
      setMessage({ type: 'success', text: 'Role cree avec succes.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation du role.' });
    }
    setCreatingRole(false);
  };

  const handleCreateShift = async () => {
    if (!festival || !activeEdition || !shiftFormTitle.trim() || !shiftFormRoleId || !shiftFormStartTime || !shiftFormEndTime)
      return;
    setCreatingShift(true);
    setMessage(null);

    const res = await api.post<Shift>(`/volunteers/festival/${festival.id}/shifts`, {
      edition_id: activeEdition.id,
      title: shiftFormTitle.trim(),
      description: shiftFormDescription.trim() || null,
      role_id: shiftFormRoleId,
      venue_id: shiftFormVenueId || null,
      start_time: new Date(shiftFormStartTime).toISOString(),
      end_time: new Date(shiftFormEndTime).toISOString(),
      max_volunteers: Number(shiftFormMaxVolunteers) || 4,
    });

    if (res.success && res.data) {
      setShifts((prev) => [...prev, res.data!]);
      setShowShiftDialog(false);
      setShiftFormTitle('');
      setShiftFormDescription('');
      setShiftFormRoleId('');
      setShiftFormVenueId('');
      setShiftFormStartTime('');
      setShiftFormEndTime('');
      setShiftFormMaxVolunteers('4');
      setMessage({ type: 'success', text: 'Creneau cree avec succes.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation du creneau.' });
    }
    setCreatingShift(false);
  };

  const handleDeleteShift = async (shift: Shift) => {
    if (!festival) return;
    if (!confirm(`Supprimer le creneau "${shift.title}" ?`)) return;
    setMessage(null);

    const res = await api.delete(`/volunteers/festival/${festival.id}/shifts/${shift.id}`);
    if (res.success) {
      setShifts((prev) => prev.filter((s) => s.id !== shift.id));
      setMessage({ type: 'success', text: 'Creneau supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.name || 'Inconnu';
  };

  const getRoleColor = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.color || '#6b7280';
  };

  const getVenueName = (venueId: string | null) => {
    if (!venueId) return null;
    const venue = venues.find((v) => v.id === venueId);
    return venue?.name || null;
  };

  const getShiftAssignmentsCount = (shiftId: string) =>
    assignments.filter((a) => a.shift_id === shiftId).length;

  const shiftAssignmentsForViewing = viewingShiftId
    ? assignments.filter((a) => a.shift_id === viewingShiftId)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Reessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Benevoles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les roles, creneaux et affectations de benevoles.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowRoleDialog(true)}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Nouveau role
          </button>
          <button
            type="button"
            onClick={() => setShowShiftDialog(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Ajouter un creneau
          </button>
        </div>
      </div>

      {/* Feedback message */}
      {message && (
        <div
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Role Create Dialog */}
      {showRoleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Nouveau role</h2>
              <button
                type="button"
                onClick={() => setShowRoleDialog(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                <input
                  type="text"
                  value={roleFormName}
                  onChange={(e) => setRoleFormName(e.target.value)}
                  placeholder="Ex : Accueil, Securite..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={roleFormDescription}
                  onChange={(e) => setRoleFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Description optionnelle"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Couleur</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={roleFormColor}
                    onChange={(e) => setRoleFormColor(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-md border border-border"
                  />
                  <input
                    type="text"
                    value={roleFormColor}
                    onChange={(e) => setRoleFormColor(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRoleDialog(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateRole}
                disabled={creatingRole || !roleFormName.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creatingRole && <Loader2 className="h-4 w-4 animate-spin" />}
                Creer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Create Dialog */}
      {showShiftDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Nouveau creneau</h2>
              <button
                type="button"
                onClick={() => setShowShiftDialog(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Titre</label>
                <input
                  type="text"
                  value={shiftFormTitle}
                  onChange={(e) => setShiftFormTitle(e.target.value)}
                  placeholder="Ex : Accueil du public"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={shiftFormDescription}
                  onChange={(e) => setShiftFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Instructions optionnelles"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
                  <select
                    value={shiftFormRoleId}
                    onChange={(e) => setShiftFormRoleId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Selectionner un role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Lieu</label>
                  <select
                    value={shiftFormVenueId}
                    onChange={(e) => setShiftFormVenueId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Aucun lieu</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Debut</label>
                  <input
                    type="datetime-local"
                    value={shiftFormStartTime}
                    onChange={(e) => setShiftFormStartTime(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Fin</label>
                  <input
                    type="datetime-local"
                    value={shiftFormEndTime}
                    onChange={(e) => setShiftFormEndTime(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Nombre max. de benevoles
                </label>
                <input
                  type="number"
                  min="1"
                  value={shiftFormMaxVolunteers}
                  onChange={(e) => setShiftFormMaxVolunteers(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowShiftDialog(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateShift}
                disabled={creatingShift || !shiftFormTitle.trim() || !shiftFormRoleId || !shiftFormStartTime || !shiftFormEndTime}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creatingShift && <Loader2 className="h-4 w-4 animate-spin" />}
                Creer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignments Viewing Dialog */}
      {viewingShiftId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Affectations ({shiftAssignmentsForViewing.length})
              </h2>
              <button
                type="button"
                onClick={() => setViewingShiftId(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {shiftAssignmentsForViewing.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Aucun benevole affecte a ce creneau.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {shiftAssignmentsForViewing.map((assignment) => (
                  <div key={assignment.id} className="py-3">
                    <p className="text-sm text-foreground">
                      Benevole : <span className="font-medium">{assignment.user_id}</span>
                    </p>
                    {assignment.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">{assignment.notes}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Affecte le {new Date(assignment.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingShiftId(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-2">
        {/* Roles */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users className="h-5 w-5" />
            Roles ({roles.length})
          </h2>
          <div className="rounded-xl border border-border bg-card">
            {roles.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun role defini. Creez un role pour commencer.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: role.color || '#6b7280' }}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{role.name}</p>
                        {role.description && (
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {shifts.filter((s) => s.role_id === role.id).length} creneaux
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Shifts */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Calendar className="h-5 w-5" />
            Creneaux ({shifts.length})
          </h2>
          <div className="space-y-3">
            {shifts.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun creneau. Ajoutez un creneau pour planifier les benevoles.
                </p>
              </div>
            ) : (
              shifts.map((shift) => {
                const assignedCount = getShiftAssignmentsCount(shift.id);
                const isFull = assignedCount >= shift.max_volunteers;
                const venueName = getVenueName(shift.venue_id);
                return (
                  <div
                    key={shift.id}
                    className="rounded-xl border border-border bg-card p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">{shift.title}</h3>
                          <span
                            className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                            style={{ backgroundColor: getRoleColor(shift.role_id) }}
                          >
                            {getRoleName(shift.role_id)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(shift.start_time).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(shift.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(shift.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {venueName && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {venueName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingShiftId(shift.id)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Voir les affectations"
                        >
                          <Users className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShift(shift)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {assignedCount} / {shift.max_volunteers} benevoles
                        </span>
                        <span
                          className={`font-medium ${
                            isFull ? 'text-green-600' : 'text-yellow-600'
                          }`}
                        >
                          {isFull ? 'Complet' : 'Places disponibles'}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{
                            width: `${Math.min((assignedCount / shift.max_volunteers) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
