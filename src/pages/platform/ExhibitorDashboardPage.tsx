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
  Store,
  ShoppingCart,
  BarChart3,
  CreditCard,
  Building2,
  Save,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileDown,
  Globe,
  Briefcase,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatTimestamp, formatCurrency } from '@/lib/format-utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { EXHIBITOR_DOMAINS } from '@/lib/exhibitor-domains';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExhibitorProfile {
  id: string;
  company_name: string | null;
  trade_name: string | null;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  siret: string | null;
  vat_number: string | null;
  activity_type: string | null;
  category: string | null;
  domains: string[];
  is_pmr: number | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
}

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
  assigned_booth_id: string | null;
  booth_code: string | null;
  booth_zone: string | null;
  review_notes: string | null;
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

type TabId = 'profile' | 'applications' | 'documents' | 'invoices' | 'visibility';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  insurance: 'Assurance', kbis: 'Kbis', id_card: "Piece d'identite", rib: 'RIB', other: 'Autre',
};
const DOCUMENT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  verified: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', verified: 'Verifie', rejected: 'Refuse',
};
const APPLICATION_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  under_review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  waitlisted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};
const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', submitted: 'Soumise', under_review: 'En cours',
  approved: 'Approuvee', rejected: 'Refusee', waitlisted: "Liste d'attente",
};
const APPLICATION_STATUS_ICONS: Record<string, typeof Check> = {
  approved: CheckCircle2, submitted: Clock, under_review: Clock, rejected: XCircle, waitlisted: AlertCircle,
};
const INVOICE_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-600',
};
const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyee', paid: 'Payee', overdue: 'En retard', cancelled: 'Annulee',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stats cards
// ---------------------------------------------------------------------------

function StatsCards({ applications, documents }: { applications: MyApplication[]; documents: MyDocument[] }) {
  const approved = applications.filter((a) => a.status === 'approved').length;
  const pending = applications.filter((a) => a.status === 'submitted' || a.status === 'under_review').length;
  const docsExpiring = documents.filter((d) => d.is_expiring_soon && !d.is_expired).length;
  const docsExpired = documents.filter((d) => d.is_expired).length;
  const docsPending = documents.filter((d) => d.status === 'pending').length;

  const cards = [
    { label: 'Candidatures approuvees', value: approved, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
    { label: 'Candidatures en cours', value: pending, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' },
    { label: 'Documents a verifier', value: docsPending, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10' },
    { label: 'Documents a renouveler', value: docsExpiring + docsExpired, icon: AlertTriangle, color: docsExpired > 0 ? 'text-red-600' : 'text-orange-500', bg: docsExpired > 0 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-orange-50 dark:bg-orange-900/10' },
  ];

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className={`rounded-xl border border-border p-4 ${c.bg}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              <Icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Profile
// ---------------------------------------------------------------------------

function ProfileTab() {
  const [profile, setProfile] = useState<ExhibitorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await api.get<ExhibitorProfile>('/exhibitors/profile');
      if (res.success && res.data) {
        const d = res.data as any;
        setProfile({
          ...d,
          domains: Array.isArray(d.domains) ? d.domains : typeof d.domains === 'string' ? JSON.parse(d.domains || '[]') : [],
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    const res = await api.post('/exhibitors/profile', {
      company_name: profile.company_name,
      trade_name: profile.trade_name,
      description: profile.description,
      website: profile.website,
      contact_email: profile.contact_email,
      contact_phone: profile.contact_phone,
      siret: profile.siret,
      vat_number: profile.vat_number,
      activity_type: profile.activity_type,
      category: profile.category,
      domains: profile.domains,
      is_pmr: profile.is_pmr,
      address_line1: profile.address_line1,
      city: profile.city,
      postal_code: profile.postal_code,
      country: profile.country,
    });
    setSaving(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Profil exposant mis a jour.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la sauvegarde.' });
    }
  };

  const update = (key: keyof ExhibitorProfile, value: unknown) => {
    if (!profile) return;
    setProfile({ ...profile, [key]: value } as ExhibitorProfile);
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!profile) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Creer votre profil exposant</h3>
        <p className="mt-2 text-sm text-muted-foreground">Renseignez les informations de votre entreprise pour candidater aux festivals.</p>
        <button type="button" onClick={() => setProfile({ id: '', company_name: '', trade_name: '', description: '', logo_url: '', website: '', contact_email: '', contact_phone: '', siret: '', vat_number: '', activity_type: '', category: '', domains: [], is_pmr: 0, address_line1: '', city: '', postal_code: '', country: 'France' })} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Building2 className="h-4 w-4" /> Commencer
        </button>
      </div>
    );
  }

  const inputCls = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';
  const labelCls = 'mb-1 block text-sm font-medium text-foreground';

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-md border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Company info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <Building2 className="h-5 w-5 text-primary" /> Informations entreprise
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Raison sociale <span className="text-destructive">*</span></label>
            <input type="text" value={profile.company_name || ''} onChange={(e) => update('company_name', e.target.value)} className={inputCls} placeholder="Mon Entreprise SAS" />
          </div>
          <div>
            <label className={labelCls}>Nom commercial</label>
            <input type="text" value={profile.trade_name || ''} onChange={(e) => update('trade_name', e.target.value)} className={inputCls} placeholder="Ma Marque" />
          </div>
          <div>
            <label className={labelCls}>SIRET</label>
            <input type="text" value={profile.siret || ''} onChange={(e) => update('siret', e.target.value)} className={inputCls} placeholder="123 456 789 00012" />
          </div>
          <div>
            <label className={labelCls}>N° TVA</label>
            <input type="text" value={profile.vat_number || ''} onChange={(e) => update('vat_number', e.target.value)} className={inputCls} placeholder="FR12345678901" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea value={profile.description || ''} onChange={(e) => update('description', e.target.value)} rows={3} className={inputCls + ' resize-none'} placeholder="Presentez votre activite..." />
          </div>
          <div>
            <label className={labelCls}>Site web</label>
            <input type="url" value={profile.website || ''} onChange={(e) => update('website', e.target.value)} className={inputCls} placeholder="https://..." />
          </div>
          <div>
            <label className={labelCls}>Type d'activite</label>
            <input type="text" value={profile.activity_type || ''} onChange={(e) => update('activity_type', e.target.value)} className={inputCls} placeholder="Artisan, editeur..." />
          </div>
        </div>
      </div>

      {/* Contact + Address */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <MapPin className="h-5 w-5 text-primary" /> Contact & Adresse
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Email de contact <span className="text-destructive">*</span></label>
            <input type="email" value={profile.contact_email || ''} onChange={(e) => update('contact_email', e.target.value)} className={inputCls} placeholder="contact@..." />
          </div>
          <div>
            <label className={labelCls}>Telephone</label>
            <input type="tel" value={profile.contact_phone || ''} onChange={(e) => update('contact_phone', e.target.value)} className={inputCls} placeholder="06 ..." />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Adresse</label>
            <input type="text" value={profile.address_line1 || ''} onChange={(e) => update('address_line1', e.target.value)} className={inputCls} placeholder="12 rue..." />
          </div>
          <div>
            <label className={labelCls}>Code postal</label>
            <input type="text" value={profile.postal_code || ''} onChange={(e) => update('postal_code', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ville</label>
            <input type="text" value={profile.city || ''} onChange={(e) => update('city', e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Domains */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <Briefcase className="h-5 w-5 text-primary" /> Domaines d'expertise
        </h3>
        <div className="flex flex-wrap gap-2">
          {EXHIBITOR_DOMAINS.map((d) => {
            const selected = profile.domains?.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => {
                  const next = selected
                    ? (profile.domains || []).filter((x) => x !== d.value)
                    : [...(profile.domains || []), d.value];
                  update('domains', next);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={!!profile.is_pmr} onChange={(e) => update('is_pmr', e.target.checked ? 1 : 0)} className="h-4 w-4 rounded border-border" />
            Stand accessible PMR
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer le profil
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Documents
// ---------------------------------------------------------------------------

function DocumentsTab() {
  const [documents, setDocuments] = useState<MyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiryDocId, setExpiryDocId] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'expired'>('all');
  const navigate = useNavigate();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await api.get<MyDocument[]>('/exhibitor-hub/my-documents');
    if (result.success && result.data) {
      setDocuments(Array.isArray(result.data) ? result.data : []);
    } else {
      setError(result.error || 'Erreur lors du chargement des documents.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const openExpiryDialog = (doc: MyDocument) => {
    setExpiryDocId(doc.id);
    setExpiryDate(doc.expires_at ? new Date(doc.expires_at * 1000).toISOString().split('T')[0] : '');
  };

  const saveExpiry = async () => {
    if (!expiryDocId) return;
    setSavingExpiry(true);
    const unixTimestamp = expiryDate ? Math.floor(new Date(expiryDate).getTime() / 1000) : null;
    await api.put(`/exhibitor-hub/documents/${expiryDocId}/expiry`, { expires_at: unixTimestamp });
    setSavingExpiry(false);
    setExpiryDocId(null);
    fetchDocuments();
  };

  const filtered = documents.filter((d) => {
    if (filter === 'pending') return d.status === 'pending';
    if (filter === 'verified') return d.status === 'verified';
    if (filter === 'expired') return d.is_expired || d.is_expiring_soon;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>;

  if (documents.length === 0) {
    return (
      <EmptyState icon={FileText} title="Aucun document" description="Ajoutez vos documents administratifs (Kbis, assurance, piece d'identite)."
        action={{ label: 'Ajouter un document', onClick: () => navigate('/profile') }} />
    );
  }

  return (
    <>
      {/* Filter bar + upload */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['all', 'pending', 'verified', 'expired'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'verified' ? 'Verifies' : 'A renouveler'}
              {f === 'expired' && (documents.filter((d) => d.is_expired || d.is_expiring_soon).length > 0) && (
                <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {documents.filter((d) => d.is_expired || d.is_expiring_soon).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <Link to="/profile" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Upload className="h-4 w-4" /> Ajouter
        </Link>
      </div>

      {/* Document cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((doc) => (
          <div key={doc.id} className={`rounded-xl border bg-card p-5 transition-shadow hover:shadow-md ${doc.is_expired ? 'border-red-300 dark:border-red-800' : doc.is_expiring_soon ? 'border-orange-300 dark:border-orange-800' : 'border-border'}`}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <Badge className="bg-muted text-foreground">{DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}</Badge>
              <Badge className={DOCUMENT_STATUS_STYLES[doc.status] || 'bg-gray-100 text-gray-600'}>{DOCUMENT_STATUS_LABELS[doc.status] || doc.status}</Badge>
            </div>
            <p className="mb-1 truncate text-sm font-medium text-foreground" title={doc.file_name}>{doc.file_name}</p>
            {doc.label && <p className="mb-2 text-xs text-muted-foreground">{doc.label}</p>}
            <p className="mb-2 text-xs text-muted-foreground">Televerse le {formatTimestamp(doc.created_at)}</p>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {doc.expires_at ? (
                <>
                  <span className="text-xs text-muted-foreground">Expire le {formatTimestamp(doc.expires_at)}</span>
                  {doc.is_expired && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Expire</Badge>}
                  {!doc.is_expired && doc.is_expiring_soon && (
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      <AlertTriangle className="mr-1 h-3 w-3" />{doc.days_until_expiry}j
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-xs italic text-muted-foreground">Pas de date d'expiration</span>
              )}
            </div>
            <button type="button" onClick={() => openExpiryDialog(doc)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent">
              <CalendarClock className="h-3.5 w-3.5" />
              {doc.expires_at ? "Modifier" : "Definir l'expiration"}
            </button>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucun document dans cette categorie.</p>}

      {/* Expiry dialog */}
      {expiryDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Date d'expiration</h3>
              <button type="button" onClick={() => setExpiryDocId(null)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="mb-4 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setExpiryDocId(null)} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Annuler</button>
              <button type="button" onClick={saveExpiry} disabled={savingExpiry} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {savingExpiry ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab: Applications (enriched)
// ---------------------------------------------------------------------------

function ApplicationsTab() {
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await api.get<MyApplication[]>('/exhibitor-hub/my-applications');
      if (result.success && result.data) setApplications(Array.isArray(result.data) ? result.data : []);
      else setError(result.error || 'Erreur lors du chargement.');
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>;
  if (applications.length === 0) return <EmptyState icon={ClipboardList} title="Aucune candidature" description="Parcourez l'annuaire des festivals pour trouver un evenement et candidater." action={{ label: 'Voir les festivals', onClick: () => window.location.href = '/directory' }} />;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {applications.map((app) => {
        const StatusIcon = APPLICATION_STATUS_ICONS[app.status] || Clock;
        return (
          <div key={app.id} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <Link to={`/f/${app.festival_slug}`} className="text-base font-semibold text-foreground hover:text-primary hover:underline">
                  {app.festival_name}
                </Link>
                <p className="text-xs text-muted-foreground">{app.edition_name}</p>
              </div>
              <Badge className={APPLICATION_STATUS_STYLES[app.status] || 'bg-gray-100 text-gray-600'}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {APPLICATION_STATUS_LABELS[app.status] || app.status}
              </Badge>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              {app.amount_cents !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-medium text-foreground">{formatCurrency(app.amount_cents)}</span>
                </div>
              )}
              {app.is_paid !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paiement</span>
                  <Badge className={app.is_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {app.is_paid ? 'Paye' : 'Non paye'}
                  </Badge>
                </div>
              )}
              {app.booth_code && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stand assigne</span>
                  <span className="font-mono text-xs font-bold text-primary">
                    {app.booth_code}{app.booth_zone ? ` (${app.booth_zone})` : ''}
                  </span>
                </div>
              )}
              {app.review_notes && app.status !== 'submitted' && (
                <div className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <strong>Note de l'organisateur :</strong> {app.review_notes}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">{formatTimestamp(app.created_at)}</span>
              <Link to={`/f/${app.festival_slug}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Voir le festival <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Invoices
// ---------------------------------------------------------------------------

function InvoicesTab() {
  const [invoices, setInvoices] = useState<MyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await api.get<MyInvoice[]>('/exhibitor-hub/my-invoices');
      if (result.success && result.data) setInvoices(Array.isArray(result.data) ? result.data : []);
      else setError(result.error || 'Erreur lors du chargement.');
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>;
  if (invoices.length === 0) return <EmptyState icon={Receipt} title="Aucune facture" description="Vos factures apparaitront ici lorsque vous aurez des paiements." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">N° Facture</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Libelle</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Festival</th>
            <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-muted-foreground">Montant TTC</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Statut</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Date</th>
            <th className="whitespace-nowrap px-4 py-3 text-center font-medium text-muted-foreground">PDF</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-foreground">{inv.invoice_number}</td>
              <td className="max-w-[200px] truncate px-4 py-3 text-foreground" title={inv.label}>{inv.label}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{inv.festival_name || '-'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">{formatCurrency(inv.total_cents)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge className={INVOICE_STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-600'}>{INVOICE_STATUS_LABELS[inv.status] || inv.status}</Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{inv.issued_at ? formatTimestamp(inv.issued_at) : '-'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-center">
                <button type="button" onClick={() => window.open(`${import.meta.env.VITE_API_URL || '/api'}/billing/invoices/${inv.id}/pdf`, '_blank')}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent" title="Telecharger PDF">
                  <FileDown className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Visibility
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
    (async () => {
      const res = await api.get<{ directory_visible: number; visibility: Record<string, string> }>('/exhibitor-hub/my-visibility');
      if (res.success && res.data) {
        setDirectoryVisible(!!res.data.directory_visible);
        setFieldVisibility(res.data.visibility || {});
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await api.put('/exhibitor-hub/my-visibility', { directory_visible: directoryVisible, visibility: fieldVisibility });
    setMessage(res.success ? { type: 'success', text: 'Parametres de visibilite mis a jour.' } : { type: 'error', text: res.error || 'Erreur' });
    setSaving(false);
  };

  const toggleField = (key: string) => {
    setFieldVisibility((prev) => ({ ...prev, [key]: prev[key] === 'public' ? 'organizer' : 'public' }));
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-md border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>
      )}

      {/* Directory opt-in */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Annuaire des exposants</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {directoryVisible
                ? 'Votre profil est visible dans l\'annuaire public. Les visiteurs et organisateurs peuvent vous trouver.'
                : 'Votre profil est masque. Seuls les organisateurs des festivals ou vous candidatez peuvent le voir.'}
            </p>
          </div>
          <button type="button" onClick={() => setDirectoryVisible(!directoryVisible)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${directoryVisible ? 'bg-primary' : 'bg-muted'}`}>
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${directoryVisible ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Per-field visibility */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Visibilite par champ</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          <Eye className="mr-1 inline h-3 w-3 text-green-600" /> <strong>Public</strong> = visible par tous | <Shield className="mr-1 inline h-3 w-3 text-orange-600" /> <strong>Organisateurs</strong> = visible uniquement par les organisateurs de festivals
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
                  {showGroup && <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{field.group}</p>}
                  <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <span className="text-sm text-foreground">{field.label}</span>
                    <button type="button" onClick={() => toggleField(field.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        isPublic ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                      {isPublic ? <><Eye className="h-3 w-3" /> Public</> : <><Shield className="h-3 w-3" /> Organisateurs</>}
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Mon profil', icon: Building2 },
  { id: 'applications', label: 'Candidatures', icon: ClipboardList },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'invoices', label: 'Factures', icon: Receipt },
  { id: 'visibility', label: 'Visibilite', icon: Eye },
];

export function ExhibitorDashboardPage() {
  const { isAuthenticated, isLoading, profile } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(new Set(['profile']));

  // Preload stats data
  const [statsApps, setStatsApps] = useState<MyApplication[]>([]);
  const [statsDocs, setStatsDocs] = useState<MyDocument[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/login', { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      api.get<MyApplication[]>('/exhibitor-hub/my-applications'),
      api.get<MyDocument[]>('/exhibitor-hub/my-documents'),
    ]).then(([appsRes, docsRes]) => {
      if (appsRes.success && appsRes.data) setStatsApps(Array.isArray(appsRes.data) ? appsRes.data : []);
      if (docsRes.success && docsRes.data) setStatsDocs(Array.isArray(docsRes.data) ? docsRes.data : []);
      setStatsLoaded(true);
    });
  }, [isAuthenticated]);

  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  };

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!isAuthenticated || !profile) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Espace exposant</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerez votre profil, candidatures, documents et factures.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/exhibitors" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <Globe className="h-4 w-4" /> Annuaire
          </Link>
          <Link to="/pos" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <ShoppingCart className="h-4 w-4" /> Caisse POS
          </Link>
          <Link to="/pos/products" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <Store className="h-4 w-4" /> Produits
          </Link>
          <Link to="/pos/accounting" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <BarChart3 className="h-4 w-4" /> Comptabilite
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      {statsLoaded && <StatsCards applications={statsApps} documents={statsDocs} />}

      {/* Tab navigation */}
      <div className="mb-6 border-b border-border">
        <nav className="-mb-px flex gap-4 overflow-x-auto" aria-label="Onglets">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => selectTab(tab.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                }`}>
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab panels */}
      <div>
        {mountedTabs.has('profile') && <div className={activeTab === 'profile' ? '' : 'hidden'}><ProfileTab /></div>}
        {mountedTabs.has('applications') && <div className={activeTab === 'applications' ? '' : 'hidden'}><ApplicationsTab /></div>}
        {mountedTabs.has('documents') && <div className={activeTab === 'documents' ? '' : 'hidden'}><DocumentsTab /></div>}
        {mountedTabs.has('invoices') && <div className={activeTab === 'invoices' ? '' : 'hidden'}><InvoicesTab /></div>}
        {mountedTabs.has('visibility') && <div className={activeTab === 'visibility' ? '' : 'hidden'}><VisibilityTab /></div>}
      </div>
    </div>
  );
}
