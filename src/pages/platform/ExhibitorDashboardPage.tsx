import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Loader2,
  FileText,
  ClipboardList,
  Receipt,
  Upload,
  CalendarClock,
  AlertTriangle,
  X,
  Check,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatTimestamp, formatCurrency } from '@/lib/format-utils';
import { EmptyState } from '@/components/shared/EmptyState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MyDocument {
  id: string;
  file_name: string;
  document_type: string;
  status: string;
  label: string | null;
  expires_at: number | null;
  created_at: number;
  is_expiring_soon: boolean;
  is_expired: boolean;
  days_until_expiry: number | null;
}

interface MyApplication {
  id: string;
  edition_id: string;
  status: string;
  created_at: number;
  amount_cents: number | null;
  is_paid: number | null;
  festival_name: string;
  festival_slug: string;
  edition_name: string;
}

interface MyInvoice {
  id: string;
  invoice_number: string;
  label: string;
  total_cents: number;
  currency: string;
  status: string;
  issued_at: number | null;
  festival_name: string | null;
  festival_slug: string | null;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TabId = 'documents' | 'applications' | 'invoices' | 'visibility';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  insurance: 'Assurance',
  kbis: 'Kbis',
  id_card: "Piece d'identite",
  rib: 'RIB',
  other: 'Autre',
};

const DOCUMENT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  verified: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  verified: 'Verifie',
  rejected: 'Refuse',
};

const APPLICATION_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  waitlisted: 'bg-orange-100 text-orange-700',
};

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Soumise',
  under_review: 'En cours',
  approved: 'Approuvee',
  rejected: 'Refusee',
  waitlisted: "Liste d'attente",
};

const INVOICE_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyee',
  paid: 'Payee',
  overdue: 'En retard',
  cancelled: 'Annulee',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tab content: Documents
// ---------------------------------------------------------------------------

function DocumentsTab() {
  const [documents, setDocuments] = useState<MyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiryDocId, setExpiryDocId] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [savingExpiry, setSavingExpiry] = useState(false);

  const navigate = useNavigate();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await api.get<MyDocument[]>('/exhibitor-hub/my-documents');
    if (result.success && result.data) {
      setDocuments(result.data);
    } else {
      setError(result.error || 'Erreur lors du chargement des documents.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const openExpiryDialog = (doc: MyDocument) => {
    setExpiryDocId(doc.id);
    if (doc.expires_at) {
      const d = new Date(doc.expires_at * 1000);
      setExpiryDate(d.toISOString().split('T')[0]);
    } else {
      setExpiryDate('');
    }
  };

  const saveExpiry = async () => {
    if (!expiryDocId) return;
    setSavingExpiry(true);
    const unixTimestamp = expiryDate ? Math.floor(new Date(expiryDate).getTime() / 1000) : null;
    const result = await api.put(`/exhibitor-hub/documents/${expiryDocId}/expiry`, {
      expires_at: unixTimestamp,
    });
    setSavingExpiry(false);
    if (result.success) {
      setExpiryDocId(null);
      fetchDocuments();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Aucun document"
        description="Vous n'avez pas encore televerse de documents. Rendez-vous sur votre profil pour en ajouter."
        action={{ label: 'Ajouter un document', onClick: () => navigate('/profile') }}
      />
    );
  }

  return (
    <>
      {/* Upload link */}
      <div className="mb-4 flex justify-end">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          Telecharger un document
        </Link>
      </div>

      {/* Document cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
          >
            {/* Type badge + status */}
            <div className="mb-3 flex items-start justify-between gap-2">
              <Badge className="bg-muted text-foreground">
                {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
              </Badge>
              <Badge className={DOCUMENT_STATUS_STYLES[doc.status] || 'bg-gray-100 text-gray-600'}>
                {DOCUMENT_STATUS_LABELS[doc.status] || doc.status}
              </Badge>
            </div>

            {/* Filename */}
            <p className="mb-1 truncate text-sm font-medium text-foreground" title={doc.file_name}>
              {doc.file_name}
            </p>
            {doc.label && (
              <p className="mb-2 text-xs text-muted-foreground">{doc.label}</p>
            )}

            {/* Upload date */}
            <p className="mb-2 text-xs text-muted-foreground">
              Televerse le {formatTimestamp(doc.created_at)}
            </p>

            {/* Expiry info */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {doc.expires_at ? (
                <>
                  <span className="text-xs text-muted-foreground">
                    Expire le {formatTimestamp(doc.expires_at)}
                  </span>
                  {doc.is_expired && (
                    <Badge className="bg-red-100 text-red-700">Expire</Badge>
                  )}
                  {!doc.is_expired && doc.is_expiring_soon && (
                    <Badge className="bg-orange-100 text-orange-700">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Expire bientot ({doc.days_until_expiry}j)
                    </Badge>
                  )}
                  {!doc.is_expired && !doc.is_expiring_soon && doc.days_until_expiry !== null && (
                    <span className="text-xs text-muted-foreground">
                      ({doc.days_until_expiry}j restants)
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs italic text-muted-foreground">
                  Pas de date d'expiration
                </span>
              )}
            </div>

            {/* Expiry edit button */}
            <button
              type="button"
              onClick={() => openExpiryDialog(doc)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {doc.expires_at ? "Modifier l'expiration" : "Definir l'expiration"}
            </button>
          </div>
        ))}
      </div>

      {/* Expiry date picker dialog */}
      {expiryDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Date d'expiration</h3>
              <button
                type="button"
                onClick={() => setExpiryDocId(null)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <label htmlFor="expiry-date" className="mb-1.5 block text-sm font-medium text-foreground">
                Date
              </label>
              <input
                id="expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setExpiryDocId(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={saveExpiry}
                disabled={savingExpiry}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {savingExpiry ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab content: Applications
// ---------------------------------------------------------------------------

function ApplicationsTab() {
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const result = await api.get<MyApplication[]>('/exhibitor-hub/my-applications');
      if (result.success && result.data) {
        setApplications(result.data);
      } else {
        setError(result.error || 'Erreur lors du chargement des candidatures.');
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Aucune candidature"
        description="Vous n'avez pas encore postule comme exposant a un festival."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Festival</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Edition</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Statut</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Montant</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Date</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                {app.festival_name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {app.edition_name}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge className={APPLICATION_STATUS_STYLES[app.status] || 'bg-gray-100 text-gray-600'}>
                  {APPLICATION_STATUS_LABELS[app.status] || app.status}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-foreground">
                {app.amount_cents !== null ? formatCurrency(app.amount_cents) : '-'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {formatTimestamp(app.created_at)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <Link
                  to={`/f/${app.festival_slug}/admin/applications/${app.id}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Voir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content: Invoices
// ---------------------------------------------------------------------------

function InvoicesTab() {
  const [invoices, setInvoices] = useState<MyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const result = await api.get<MyInvoice[]>('/exhibitor-hub/my-invoices');
      if (result.success && result.data) {
        setInvoices(result.data);
      } else {
        setError(result.error || 'Erreur lors du chargement des factures.');
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Aucune facture"
        description="Vous n'avez aucune facture pour le moment."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">N° Facture</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Libelle</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Festival</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Montant TTC</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Statut</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Emise le</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-foreground">
                {inv.invoice_number}
              </td>
              <td className="max-w-[200px] truncate px-4 py-3 text-foreground" title={inv.label}>
                {inv.label}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {inv.festival_name || '-'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                {formatCurrency(inv.total_cents)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge className={INVOICE_STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-600'}>
                  {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {inv.issued_at ? formatTimestamp(inv.issued_at) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visibility Tab
// ---------------------------------------------------------------------------

const VISIBILITY_FIELDS: { key: string; label: string; group?: string }[] = [
  { key: 'contact_first_name', label: 'Nom du responsable', group: 'Contact' },
  { key: 'contact_last_name', label: 'Prenom du responsable', group: 'Contact' },
  { key: 'contact_email', label: 'Email de contact', group: 'Contact' },
  { key: 'contact_phone', label: 'Telephone', group: 'Contact' },
  { key: 'registration_number', label: 'KBIS / INSEE', group: 'Administratif' },
  { key: 'siret', label: 'SIRET', group: 'Administratif' },
  { key: 'vat_number', label: 'Numero TVA', group: 'Administratif' },
  { key: 'legal_form', label: 'Forme juridique', group: 'Administratif' },
  { key: 'insurer_name', label: 'Assureur', group: 'Assurance' },
  { key: 'insurance_contract_number', label: 'N° contrat assurance', group: 'Assurance' },
  { key: 'kbis_file_url', label: 'Document KBIS', group: 'Documents' },
  { key: 'insurance_file_url', label: 'Attestation assurance', group: 'Documents' },
  { key: 'id_file_url', label: "Piece d'identite", group: 'Documents' },
  { key: 'address_line1', label: 'Adresse siege', group: 'Adresse' },
  { key: 'postal_code', label: 'Code postal siege', group: 'Adresse' },
  { key: 'billing_address_line1', label: 'Adresse de facturation', group: 'Facturation' },
  { key: 'billing_postal_code', label: 'Code postal facturation', group: 'Facturation' },
  { key: 'billing_city', label: 'Ville facturation', group: 'Facturation' },
];

function VisibilityTab() {
  const [directoryVisible, setDirectoryVisible] = useState(true);
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function fetch() {
      const res = await api.get<{ directory_visible: number; visibility: Record<string, string> }>('/exhibitor-hub/my-visibility');
      if (res.success && res.data) {
        setDirectoryVisible(!!res.data.directory_visible);
        setFieldVisibility(res.data.visibility || {});
      }
      setLoading(false);
    }
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await api.put('/exhibitor-hub/my-visibility', {
      directory_visible: directoryVisible,
      visibility: fieldVisibility,
    });
    if (res.success) {
      setMessage({ type: 'success', text: 'Parametres de visibilite mis a jour.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur' });
    }
    setSaving(false);
  };

  const toggleField = (key: string) => {
    setFieldVisibility((prev) => ({
      ...prev,
      [key]: prev[key] === 'public' ? 'organizer' : 'public',
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Directory opt-in */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Annuaire des exposants</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Votre profil est-il visible dans l'annuaire public des exposants ?
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDirectoryVisible(!directoryVisible)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              directoryVisible ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                directoryVisible ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Per-field visibility */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-1 text-sm font-semibold text-foreground">
          Visibilite des informations
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Choisissez quelles informations sont visibles publiquement ou uniquement par les organisateurs.
        </p>
        <div className="space-y-4">
          {(() => {
            let lastGroup = '';
            return VISIBILITY_FIELDS.map((field) => {
              const isPublic = fieldVisibility[field.key] === 'public';
              const showGroup = field.group && field.group !== lastGroup;
              if (field.group) lastGroup = field.group;
              return (
                <div key={field.key}>
                  {showGroup && (
                    <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {field.group}
                    </p>
                  )}
                  <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <span className="text-sm text-foreground">{field.label}</span>
                    <button
                      type="button"
                      onClick={() => toggleField(field.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        isPublic
                          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}
                    >
                      {isPublic ? (
                        <>
                          <Eye className="h-3 w-3" />
                          Public
                        </>
                      ) : (
                        <>
                          <Shield className="h-3 w-3" />
                          Organisateurs
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'documents', label: 'Mes documents', icon: FileText },
  { id: 'applications', label: 'Mes candidatures', icon: ClipboardList },
  { id: 'invoices', label: 'Mes factures', icon: Receipt },
  { id: 'visibility', label: 'Visibilite', icon: Eye },
];

export function ExhibitorDashboardPage() {
  const { isAuthenticated, isLoading, profile } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('documents');
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(new Set(['documents']));

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Lazy-mount: mark tab as mounted only when first selected
  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Espace exposant
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gerez vos documents, candidatures et factures depuis un seul endroit.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/pos"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Caisse (POS)
          </Link>
          <Link
            to="/pos/products"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Produits & Stock
          </Link>
          <Link
            to="/pos/accounting"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Comptabilite
          </Link>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mb-6 border-b border-border">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Onglets">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab panels (lazy mounted, hidden when inactive) */}
      <div>
        {mountedTabs.has('documents') && (
          <div className={activeTab === 'documents' ? '' : 'hidden'}>
            <DocumentsTab />
          </div>
        )}
        {mountedTabs.has('applications') && (
          <div className={activeTab === 'applications' ? '' : 'hidden'}>
            <ApplicationsTab />
          </div>
        )}
        {mountedTabs.has('invoices') && (
          <div className={activeTab === 'invoices' ? '' : 'hidden'}>
            <InvoicesTab />
          </div>
        )}
        {mountedTabs.has('visibility') && (
          <div className={activeTab === 'visibility' ? '' : 'hidden'}>
            <VisibilityTab />
          </div>
        )}
      </div>
    </div>
  );
}
