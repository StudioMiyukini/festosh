import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Shield,
  Users,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  Check,
  Lock,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Permission {
  key: string;
  label: string;
  group: string;
  category?: string; // alias
}

interface PermissionGroup {
  category: string;
  permissions: Permission[];
}

interface CustomRole {
  id: string;
  festival_id: string;
  edition_id: string | null;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
  permissions: string[];
  member_count: number;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  base_role: string;
  custom_role_id: string | null;
  custom_role_name: string | null;
  custom_role_color: string | null;
  username: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  permissions: string[];
  joined_at: string;
}

type FestivalBaseRole = 'owner' | 'admin' | 'editor' | 'moderator' | 'volunteer' | 'exhibitor';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_ROLE_LABELS: Record<FestivalBaseRole, string> = {
  owner: 'Proprietaire',
  admin: 'Administrateur',
  editor: 'Editeur',
  moderator: 'Moderateur',
  volunteer: 'Benevole',
  exhibitor: 'Exposant',
};

const BASE_ROLE_COLORS: Record<FestivalBaseRole, string> = {
  owner: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  editor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  moderator: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  volunteer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  exhibitor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const BASE_ROLES: FestivalBaseRole[] = ['owner', 'admin', 'editor', 'moderator', 'volunteer', 'exhibitor'];

const CATEGORY_LABELS: Record<string, string> = {
  CMS: 'CMS',
  Programme: 'Programme',
  Exposants: 'Exposants',
  Benevoles: 'Benevoles',
  Budget: 'Budget',
  Billetterie: 'Billetterie',
  Sponsors: 'Sponsors',
  Gamification: 'Gamification',
  Votes: 'Votes',
  Tombola: 'Tombola',
  'QR Codes': 'QR Codes',
  Artistes: 'Artistes',
  "Files d'attente": "Files d'attente",
  Reservations: 'Reservations',
  Materiel: 'Materiel',
  Analytics: 'Analytics',
  Marketplace: 'Marketplace',
  Parametres: 'Parametres',
  Membres: 'Membres',
};

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const map = new Map<string, Permission[]>();
  for (const p of permissions) {
    const cat = p.group || p.category || 'Autre';
    const existing = map.get(cat) || [];
    existing.push(p);
    map.set(cat, existing);
  }
  // Sort categories according to CATEGORY_LABELS order
  const categoryOrder = Object.keys(CATEGORY_LABELS);
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      const ia = categoryOrder.indexOf(a);
      const ib = categoryOrder.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })
    .map(([category, perms]) => ({ category, permissions: perms }));
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminRolesPage() {
  const { festival, activeEdition } = useTenantStore();

  // Data state
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected role for detail panel
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Role dialog state
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#6366f1');
  const [formEditionId, setFormEditionId] = useState<string>('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formPermissions, setFormPermissions] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Member role update loading
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);

    const [rolesRes, membersRes, permsRes] = await Promise.all([
      api.get<CustomRole[]>(`/custom-roles/festival/${festival.id}`),
      api.get<TeamMember[]>(`/custom-roles/festival/${festival.id}/members`),
      api.get<{ permissions: Permission[]; grouped: Record<string, Permission[]> }>(`/custom-roles/permissions`),
    ]);

    if (rolesRes.success && rolesRes.data) {
      setRoles(rolesRes.data);
    } else {
      setError(rolesRes.error || 'Impossible de charger les roles.');
    }

    if (membersRes.success && membersRes.data) {
      setMembers(membersRes.data);
    }

    if (permsRes.success && permsRes.data) {
      setAllPermissions(permsRes.data.permissions || []);
    }

    setLoading(false);
  }, [festival]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Role dialog helpers
  // -------------------------------------------------------------------------

  const resetRoleForm = () => {
    setFormName('');
    setFormDescription('');
    setFormColor('#6366f1');
    setFormEditionId('');
    setFormIsDefault(false);
    setFormPermissions(new Set());
    setCollapsedGroups(new Set());
    setEditingRole(null);
  };

  const openCreateDialog = () => {
    resetRoleForm();
    setShowRoleDialog(true);
  };

  const openEditDialog = (role: CustomRole) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormColor(role.color);
    setFormEditionId(role.edition_id || '');
    setFormIsDefault(role.is_default);
    setFormPermissions(new Set(role.permissions));
    setCollapsedGroups(new Set());
    setShowRoleDialog(true);
  };

  const toggleGroupCollapse = (category: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const togglePermission = (key: string) => {
    setFormPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAllInGroup = (perms: Permission[]) => {
    setFormPermissions((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        next.add(p.key);
      }
      return next;
    });
  };

  const deselectAllInGroup = (perms: Permission[]) => {
    setFormPermissions((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        next.delete(p.key);
      }
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Save role
  // -------------------------------------------------------------------------

  const handleSaveRole = async () => {
    if (!festival || !formName.trim()) return;
    setSubmitting(true);
    setMessage(null);

    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      color: formColor,
      edition_id: formEditionId || null,
      is_default: formIsDefault,
      permissions: Array.from(formPermissions),
    };

    if (editingRole) {
      const res = await api.put<CustomRole>(
        `/custom-roles/${editingRole.id}`,
        payload,
      );
      if (res.success && res.data) {
        setRoles((prev) => prev.map((r) => (r.id === editingRole.id ? res.data! : r)));
        setShowRoleDialog(false);
        resetRoleForm();
        setMessage({ type: 'success', text: 'Role mis a jour avec succes.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour du role.' });
      }
    } else {
      const res = await api.post<CustomRole>(
        `/custom-roles/festival/${festival.id}`,
        payload,
      );
      if (res.success && res.data) {
        setRoles((prev) => [...prev, res.data!]);
        setShowRoleDialog(false);
        resetRoleForm();
        setMessage({ type: 'success', text: 'Role cree avec succes.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation du role.' });
      }
    }

    setSubmitting(false);
  };

  // -------------------------------------------------------------------------
  // Delete role
  // -------------------------------------------------------------------------

  const handleDeleteRole = async (role: CustomRole) => {
    if (!festival) return;
    if (!confirm(`Supprimer le role "${role.name}" ? Les membres associes perdront ce role personnalise.`)) return;
    setMessage(null);

    const res = await api.delete(`/custom-roles/${role.id}`);
    if (res.success) {
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      if (selectedRoleId === role.id) setSelectedRoleId(null);
      setMessage({ type: 'success', text: 'Role supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression du role.' });
    }
  };

  // -------------------------------------------------------------------------
  // Update member role
  // -------------------------------------------------------------------------

  const handleUpdateMemberRole = async (
    member: TeamMember,
    updates: { base_role?: string; custom_role_id?: string | null },
  ) => {
    if (!festival) return;
    setUpdatingMemberId(member.id);
    setMessage(null);

    const res = await api.put<TeamMember>(
      `/custom-roles/festival/${festival.id}/members/${member.id}/role`,
      {
        base_role: updates.base_role ?? member.base_role,
        custom_role_id: updates.custom_role_id !== undefined ? updates.custom_role_id : member.custom_role_id,
      },
    );

    if (res.success && res.data) {
      setMembers((prev) => prev.map((m) => (m.id === member.id ? res.data! : m)));
      setMessage({ type: 'success', text: `Role de ${member.display_name || member.username} mis a jour.` });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour du membre.' });
    }

    setUpdatingMemberId(null);
  };

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const permissionGroups = groupPermissions(allPermissions);
  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;

  // -------------------------------------------------------------------------
  // Loading / Error states
  // -------------------------------------------------------------------------

  if (!festival) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les roles personnalises et les permissions des membres de l&apos;equipe.
          </p>
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

      {/* Create / Edit Role Dialog */}
      {showRoleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingRole ? 'Modifier le role' : 'Creer un role'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowRoleDialog(false); resetRoleForm(); }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Nom <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex : Responsable technique"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Description optionnelle du role"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Color + Edition + Default row */}
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Color */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Couleur</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded-md border border-border"
                    />
                    <input
                      type="text"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormColor(c)}
                        className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                          formColor === c ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Edition */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Edition</label>
                  <select
                    value={formEditionId}
                    onChange={(e) => setFormEditionId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Toutes les editions</option>
                    {activeEdition && (
                      <option value={activeEdition.id}>{activeEdition.name}</option>
                    )}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Laissez vide pour appliquer a toutes.
                  </p>
                </div>

                {/* Default toggle */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Par defaut</label>
                  <button
                    type="button"
                    onClick={() => setFormIsDefault(!formIsDefault)}
                    className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      formIsDefault
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        formIsDefault
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {formIsDefault && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    Auto-assigner aux nouveaux benevoles
                  </button>
                </div>
              </div>

              {/* Permissions */}
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-sm font-semibold text-foreground">
                  Permissions ({formPermissions.size} selectionnee{formPermissions.size > 1 ? 's' : ''})
                </p>

                {permissionGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune permission disponible.</p>
                ) : (
                  <div className="space-y-2">
                    {permissionGroups.map((group) => {
                      const isCollapsed = collapsedGroups.has(group.category);
                      const selectedInGroup = group.permissions.filter((p) => formPermissions.has(p.key)).length;
                      const allSelected = selectedInGroup === group.permissions.length;

                      return (
                        <div key={group.category} className="rounded-lg border border-border">
                          {/* Group header */}
                          <button
                            type="button"
                            onClick={() => toggleGroupCollapse(group.category)}
                            className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm font-medium text-foreground">
                                {CATEGORY_LABELS[group.category] || group.category}
                              </span>
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {selectedInGroup}/{group.permissions.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  allSelected
                                    ? deselectAllInGroup(group.permissions)
                                    : selectAllInGroup(group.permissions);
                                }}
                                className="text-[11px] font-medium text-primary hover:underline"
                              >
                                {allSelected ? 'Tout deselectionner' : 'Tout selectionner'}
                              </button>
                            </div>
                          </button>

                          {/* Group permissions */}
                          {!isCollapsed && (
                            <div className="border-t border-border px-3 py-2">
                              <div className="grid gap-1 sm:grid-cols-2">
                                {group.permissions.map((perm) => (
                                  <label
                                    key={perm.key}
                                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                                  >
                                    <div
                                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                        formPermissions.has(perm.key)
                                          ? 'border-primary bg-primary'
                                          : 'border-muted-foreground'
                                      }`}
                                    >
                                      {formPermissions.has(perm.key) && (
                                        <Check className="h-3 w-3 text-primary-foreground" />
                                      )}
                                    </div>
                                    <span className="text-sm text-foreground">{perm.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Dialog actions */}
            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => { setShowRoleDialog(false); resetRoleForm(); }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                disabled={submitting || !formName.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingRole ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        {/* LEFT SECTION: Roles */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Shield className="h-5 w-5" />
              Roles personnalises
            </h2>
            <button
              type="button"
              onClick={openCreateDialog}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Creer un role
            </button>
          </div>

          {roles.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucun role personnalise. Creez-en un pour affiner les permissions.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => {
                const isSelected = selectedRoleId === role.id;
                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleId(isSelected ? null : role.id)}
                    className={`cursor-pointer rounded-xl border bg-card p-4 transition-colors ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary/30'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">{role.name}</p>
                            {role.is_default && (
                              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                Defaut
                              </span>
                            )}
                          </div>
                          {role.description && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 ml-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(role);
                          }}
                          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role);
                          }}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Meta badges */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {role.member_count} membre{role.member_count !== 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Role Detail Panel */}
          {selectedRole && (
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: selectedRole.color }}
                />
                <h3 className="text-sm font-semibold text-foreground">{selectedRole.name}</h3>
              </div>
              {selectedRole.description && (
                <p className="mb-3 text-xs text-muted-foreground">{selectedRole.description}</p>
              )}
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Permissions ({selectedRole.permissions.length})
              </p>
              {selectedRole.permissions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune permission attribuee.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedRole.permissions.map((key) => {
                    const perm = allPermissions.find((p) => p.key === key);
                    return (
                      <span
                        key={key}
                        className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {perm?.label || key}
                      </span>
                    );
                  })}
                </div>
              )}
              {selectedRole.edition_id && activeEdition && selectedRole.edition_id === activeEdition.id && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Limite a l&apos;edition : <span className="font-medium text-foreground">{activeEdition.name}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SECTION: Members */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users className="h-5 w-5" />
            Membres de l&apos;equipe ({members.length})
          </h2>

          {members.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucun membre dans l&apos;equipe.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Membre
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Role de base
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Role personnalise
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Permissions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members.map((member) => {
                      const baseRole = member.base_role as FestivalBaseRole;
                      const isUpdating = updatingMemberId === member.id;
                      const memberCustomRole = roles.find((r) => r.id === member.custom_role_id);

                      return (
                        <tr key={member.id} className="hover:bg-muted/50">
                          {/* Avatar + Name */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-3">
                              {member.avatar_url ? (
                                <img
                                  src={member.avatar_url}
                                  alt=""
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                  {getInitials(member.display_name, member.email)}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {member.display_name || member.username}
                                </p>
                                <p className="text-xs text-muted-foreground">@{member.username}</p>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                            {member.email || '—'}
                          </td>

                          {/* Base role dropdown */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="relative">
                              <select
                                value={member.base_role}
                                onChange={(e) =>
                                  handleUpdateMemberRole(member, { base_role: e.target.value })
                                }
                                disabled={isUpdating || baseRole === 'owner'}
                                className={`w-full appearance-none rounded-md border border-border px-2.5 py-1.5 pr-7 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60 ${
                                  BASE_ROLE_COLORS[baseRole] || 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {BASE_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {BASE_ROLE_LABELS[r]}
                                  </option>
                                ))}
                              </select>
                              {isUpdating && (
                                <Loader2 className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </td>

                          {/* Custom role dropdown */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="relative flex items-center gap-2">
                              {memberCustomRole && (
                                <div
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: memberCustomRole.color }}
                                />
                              )}
                              <select
                                value={member.custom_role_id || ''}
                                onChange={(e) =>
                                  handleUpdateMemberRole(member, {
                                    custom_role_id: e.target.value || null,
                                  })
                                }
                                disabled={isUpdating}
                                className="w-full appearance-none rounded-md border border-border bg-background px-2.5 py-1.5 pr-7 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <option value="">Aucun</option>
                                {roles.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* Permissions count */}
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              <Lock className="h-3 w-3" />
                              {member.permissions?.length ?? 0}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
