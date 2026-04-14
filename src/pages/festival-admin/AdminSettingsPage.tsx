import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Save,
  Loader2,
  Globe,
  Palette,
  Type,
  Link as LinkIcon,
  AlertTriangle,
  AlertCircle,
  Users,
  Trash2,
  Shield,
  Clock,
  CalendarDays,
  Copy,
  Mail,
  Send,
  Eye,
  Server,
  Lock,
  Calendar,
  Settings,
  UserPlus,
  Search,
  Check,
  ExternalLink,
  Building,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import type { Festival, FestivalMember, VisitorHours, EmailConfig } from '@/types/festival';
import type { FestivalStatus } from '@/types/enums';

type SettingsTab = 'general' | 'theme' | 'communication';

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Nunito',
  'Source Sans 3',
  'DM Sans',
  'Space Grotesk',
];

const HEADER_STYLES = [
  { value: 'default', label: 'Classique', desc: 'Logo a gauche, navigation a droite' },
  { value: 'centered', label: 'Centre', desc: 'Logo centre, navigation en dessous' },
  { value: 'minimal', label: 'Minimal', desc: 'Logo compact, navigation en hamburger' },
];

export function AdminSettingsPage() {
  const { festival, setFestival, activeEdition, setActiveEdition } = useTenantStore();
  const location = useLocation();

  // Derive active tab from URL
  const activeTab: SettingsTab = location.pathname.endsWith('/theme')
    ? 'theme'
    : location.pathname.endsWith('/communication')
      ? 'communication'
      : 'general';

  // Edition dates & visitor hours
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visitorHours, setVisitorHours] = useState<VisitorHours[]>([]);
  const [isSavingEdition, setIsSavingEdition] = useState(false);
  const [editionMessage, setEditionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General info
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [status, setStatus] = useState<FestivalStatus>('draft');

  // Organizer identity
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [orgSiret, setOrgSiret] = useState('');
  const [orgRna, setOrgRna] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgIban, setOrgIban] = useState('');
  const [orgInsurance, setOrgInsurance] = useState('');

  // Theme
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#111827');
  const [themeFont, setThemeFont] = useState('Inter');
  const [headerStyle, setHeaderStyle] = useState('default');
  const [customCss, setCustomCss] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // Social links
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [discord, setDiscord] = useState('');


  // Members
  const [members, setMembers] = useState<FestivalMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Invite links
  const [invites, setInvites] = useState<Array<{ id: string; token: string; role: string; max_uses: number; use_count: number; expires_at: number | null; created_at: number }>>([]);
  const [inviteRole, setInviteRole] = useState('volunteer');
  const [inviteMaxUses, setInviteMaxUses] = useState(0);
  const [inviteExpiresDays, setInviteExpiresDays] = useState(7);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Email search for adding members
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; display_name: string | null; email: string; avatar_url: string | null; is_member: boolean }>>([]);
  const [searching, setSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [addRole, setAddRole] = useState('volunteer');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form from festival data
  useEffect(() => {
    if (!festival) return;
    setName(festival.name);
    setSlug(festival.slug);
    setDescription(festival.description || '');
    setLocationName(festival.location_name || '');
    setLocationAddress(festival.location_address || '');
    setContactEmail(festival.contact_email || '');
    setStatus(festival.status);
    setPrimaryColor(festival.theme_colors?.primary || '#6366f1');
    setSecondaryColor(festival.theme_colors?.secondary || '#8b5cf6');
    setAccentColor(festival.theme_colors?.accent || '#f59e0b');
    setBgColor(festival.theme_colors?.background || '#ffffff');
    setTextColor(festival.theme_colors?.text || '#111827');
    setThemeFont(festival.theme_font || 'Inter');
    setHeaderStyle(festival.header_style || 'default');
    setCustomCss(festival.custom_css || '');
    setLogoUrl(festival.logo_url || '');
    setBannerUrl(festival.banner_url || '');
    setWebsite(festival.social_links?.website || '');
    setInstagram(festival.social_links?.instagram || '');
    setFacebook(festival.social_links?.facebook || '');
    setTwitter(festival.social_links?.twitter || '');
    setDiscord(festival.social_links?.discord || '');
    setOrgName(festival.org_name || '');
    setOrgType(festival.org_type || '');
    setOrgSiret(festival.org_siret || '');
    setOrgRna(festival.org_rna || '');
    setOrgAddress(festival.org_address || '');
    setOrgPhone(festival.org_phone || '');
    setOrgEmail(festival.org_email || '');
    setOrgIban(festival.org_iban || '');
    setOrgInsurance(festival.org_insurance || '');
  }, [festival]);

  // Initialize edition fields
  useEffect(() => {
    if (!activeEdition) return;
    setStartDate(activeEdition.start_date || '');
    setEndDate(activeEdition.end_date || '');
    setVisitorHours(activeEdition.visitor_hours || []);
  }, [activeEdition]);

  // Generate days between start and end dates
  const getDaysBetween = (start: string, end: string): string[] => {
    if (!start || !end) return [];
    const result: string[] = [];
    const d = new Date(start);
    const last = new Date(end);
    while (d <= last) {
      result.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return result;
  };

  const days = getDaysBetween(startDate, endDate);

  const formatDayLabel = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const monthNames = ['janv.', 'fevr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'aout', 'sept.', 'oct.', 'nov.', 'dec.'];
    return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
  };

  const getHoursForDay = (date: string): VisitorHours => {
    return visitorHours.find((h) => h.date === date) || { date, opens_at: '09:00', closes_at: '18:00' };
  };

  const updateHoursForDay = (date: string, field: 'opens_at' | 'closes_at', value: string) => {
    setVisitorHours((prev) => {
      const existing = prev.find((h) => h.date === date);
      if (existing) {
        return prev.map((h) => (h.date === date ? { ...h, [field]: value } : h));
      }
      return [...prev, { date, opens_at: '09:00', closes_at: '18:00', [field]: value }];
    });
  };

  const applyToAllDays = () => {
    if (days.length === 0) return;
    const first = getHoursForDay(days[0]);
    setVisitorHours(days.map((date) => ({ date, opens_at: first.opens_at, closes_at: first.closes_at })));
  };

  // Sync visitor_hours when dates change
  useEffect(() => {
    if (days.length === 0) return;
    setVisitorHours((prev) => {
      const daysSet = new Set(days);
      const kept = prev.filter((h) => daysSet.has(h.date));
      const existingDates = new Set(kept.map((h) => h.date));
      const added = days
        .filter((d) => !existingDates.has(d))
        .map((d) => ({ date: d, opens_at: '09:00', closes_at: '18:00' }));
      return [...kept, ...added].sort((a, b) => a.date.localeCompare(b.date));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handleSaveEdition = async () => {
    if (!activeEdition) return;
    setIsSavingEdition(true);
    setEditionMessage(null);
    const res = await api.put(`/editions/${activeEdition.id}`, {
      start_date: startDate || null,
      end_date: endDate || null,
      visitor_hours: visitorHours.filter((h) => days.includes(h.date)),
    });
    if (res.success) {
      setEditionMessage({ type: 'success', text: 'Dates et horaires enregistres.' });
      if (res.data && typeof res.data === 'object') {
        setActiveEdition(res.data as typeof activeEdition);
      }
    } else {
      setEditionMessage({ type: 'error', text: res.error || 'Erreur lors de la sauvegarde.' });
    }
    setIsSavingEdition(false);
  };

  const fetchMembers = useCallback(async () => {
    if (!festival) return;
    setLoadingMembers(true);
    const res = await api.get<FestivalMember[]>(`/festivals/${festival.id}/members`);
    if (res.success && res.data) {
      setMembers(res.data);
    }
    setLoadingMembers(false);
  }, [festival]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!festival) return;
    setIsSaving(true);
    setMessage(null);
    const res = await api.put(`/festivals/${festival.id}`, {
      name: name.trim(),
      description: description.trim() || null,
      city: locationName.trim() || null,
      address: locationAddress.trim() || null,
      contact_email: contactEmail.trim() || null,
      status,
      social_links: {
        website: website.trim() || undefined,
        instagram: instagram.trim() || undefined,
        facebook: facebook.trim() || undefined,
        twitter: twitter.trim() || undefined,
        discord: discord.trim() || undefined,
      },
      org_name: orgName.trim() || null,
      org_type: orgType || null,
      org_siret: orgSiret.trim() || null,
      org_rna: orgRna.trim() || null,
      org_address: orgAddress.trim() || null,
      org_phone: orgPhone.trim() || null,
      org_email: orgEmail.trim() || null,
      org_iban: orgIban.trim() || null,
      org_insurance: orgInsurance.trim() || null,
    });
    if (res.success) {
      setMessage({ type: 'success', text: 'Parametres enregistres avec succes.' });
      if (res.data && typeof res.data === 'object') {
        setFestival(res.data as typeof festival);
      }
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la sauvegarde.' });
    }
    setIsSaving(false);
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!festival) return;
    setIsSaving(true);
    setMessage(null);
    const res = await api.put(`/festivals/${festival.id}`, {
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      bg_color: bgColor,
      text_color: textColor,
      theme_font: themeFont,
      header_style: headerStyle,
      custom_css: customCss.trim() || null,
      logo_url: logoUrl.trim() || null,
      banner_url: bannerUrl.trim() || null,
    });
    if (res.success) {
      setMessage({ type: 'success', text: 'Theme enregistre avec succes.' });
      if (res.data && typeof res.data === 'object') {
        setFestival(res.data as typeof festival);
      }
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la sauvegarde.' });
    }
    setIsSaving(false);
  };


  const handleDeleteFestival = async () => {
    if (!festival) return;
    const confirmation = prompt(
      `Pour confirmer la suppression, tapez le nom du festival : "${festival.name}"`
    );
    if (confirmation !== festival.name) {
      setMessage({ type: 'error', text: 'Le nom ne correspond pas. Suppression annulee.' });
      return;
    }
    setIsDeleting(true);
    setMessage(null);
    const res = await api.delete(`/festivals/${festival.id}`);
    if (res.success) {
      setMessage({ type: 'success', text: 'Festival supprime. Vous allez etre redirige.' });
      setTimeout(() => { window.location.href = '/'; }, 2000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
    setIsDeleting(false);
  };

  const handleArchive = async () => {
    if (!festival) return;
    if (!confirm('Archiver le festival ? Il ne sera plus visible publiquement.')) return;
    setMessage(null);
    const res = await api.put(`/festivals/${festival.id}`, { status: 'archived' });
    if (res.success) {
      setStatus('archived');
      setMessage({ type: 'success', text: 'Festival archive.' });
    } else {
      setMessage({ type: 'error', text: res.error || "Erreur lors de l'archivage." });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!festival) return;
    if (!confirm("Retirer ce membre de l'equipe ?")) return;
    setMessage(null);
    const res = await api.delete(`/festivals/${festival.id}/members/${memberId}`);
    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setMessage({ type: 'success', text: 'Membre retire.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression du membre.' });
    }
  };

  // ─── Invite links ────────────────────────────────────────────────────────────
  const fetchInvites = useCallback(async () => {
    if (!festival) return;
    const res = await api.get<typeof invites>(`/invites/festival/${festival.id}`);
    if (res.success && res.data) setInvites(res.data);
  }, [festival]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleCreateInvite = async () => {
    if (!festival) return;
    setCreatingInvite(true);
    const res = await api.post<(typeof invites)[0]>(`/invites/festival/${festival.id}/create`, {
      role: inviteRole,
      max_uses: inviteMaxUses,
      expires_in_days: inviteExpiresDays,
    });
    if (res.success && res.data) {
      setInvites((prev) => [res.data!, ...prev]);
    }
    setCreatingInvite(false);
  };

  const handleDeleteInvite = async (inviteId: string) => {
    await api.delete(`/invites/${inviteId}`);
    setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
  };

  const getInviteUrl = (token: string) => {
    const base = window.location.origin;
    return `${base}/join/${token}`;
  };

  const handleCopyInvite = (invite: (typeof invites)[0]) => {
    navigator.clipboard.writeText(getInviteUrl(invite.token));
    setCopiedInviteId(invite.id);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  // ─── Email search ────────────────────────────────────────────────────────────
  const handleSearchEmail = useCallback(async () => {
    if (!festival || searchEmail.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const res = await api.get<typeof searchResults>(`/invites/search/users?email=${encodeURIComponent(searchEmail)}&festival_id=${festival.id}`);
    if (res.success && res.data) {
      setSearchResults(res.data);
    }
    setSearching(false);
  }, [festival, searchEmail]);

  useEffect(() => {
    const timer = setTimeout(handleSearchEmail, 400);
    return () => clearTimeout(timer);
  }, [handleSearchEmail]);

  const handleAddMember = async (userId: string) => {
    if (!festival) return;
    setAddingUserId(userId);
    const res = await api.post(`/festivals/${festival.id}/members`, {
      user_id: userId,
      role: addRole,
    });
    if (res.success) {
      setSearchResults((prev) => prev.map((u) => u.id === userId ? { ...u, is_member: true } : u));
      fetchMembers();
      setMessage({ type: 'success', text: 'Membre ajoute avec succes !' });
    } else {
      setMessage({ type: 'error', text: res.error || "Erreur lors de l'ajout." });
    }
    setAddingUserId(null);
  };

  if (!festival) {
    return (
      <div className="flex items-center justify-center py-20">
        <AlertCircle className="mr-2 h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucun festival selectionne.</p>
      </div>
    );
  }

  // ─── Feedback banner ────────────────────────────────────────────────────────
  const FeedbackBanner = ({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) => {
    if (!msg) return null;
    return (
      <div
        className={`mb-6 rounded-md border px-4 py-3 text-sm ${
          msg.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}
      >
        {msg.text}
      </div>
    );
  };

  // ─── Color picker helper ──────────────────────────────────────────────────
  const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-md border border-border" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {activeTab === 'general' && 'Parametres generaux'}
          {activeTab === 'theme' && 'Theme et apparence'}
          {activeTab === 'communication' && 'Communication'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeTab === 'general' && 'Configurez les informations de votre festival.'}
          {activeTab === 'theme' && "Personnalisez l'apparence du site public de votre festival."}
          {activeTab === 'communication' && "Configurez l'envoi d'emails pour votre festival."}
        </p>
      </div>

      {/* ═══════════════════════ TAB: GENERAL ═══════════════════════ */}
      {activeTab === 'general' && (
        <>
          <FeedbackBanner msg={message} />
          <form onSubmit={handleSaveGeneral} className="space-y-8">
            {/* General Settings */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Type className="h-5 w-5" />
                Informations generales
              </h2>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">Nom du festival</label>
                    <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-foreground">Slug (URL)</label>
                    <div className="flex items-center">
                      <span className="rounded-l-md border border-r-0 border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground">festosh.app/f/</span>
                      <input id="slug" type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
                        className="w-full rounded-r-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                  <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                    className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-foreground">Lieu / Ville</label>
                    <input id="location" type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Ex: Paris"
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-foreground">Adresse</label>
                    <input id="address" type="text" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} placeholder="Adresse complete"
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact_email" className="mb-1.5 block text-sm font-medium text-foreground">Email de contact</label>
                    <input id="contact_email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@festival.com"
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-foreground">Statut du festival</label>
                    <select id="status" value={status} onChange={(e) => setStatus(e.target.value as FestivalStatus)}
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="draft">Brouillon</option>
                      <option value="published">Publie</option>
                      <option value="archived">Archive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Opening Dates & Visitor Hours */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
                <CalendarDays className="h-5 w-5" />
                Dates et horaires d&apos;ouverture
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Definissez les dates du festival et les horaires d&apos;ouverture au public pour chaque journee.
              </p>
              <FeedbackBanner msg={editionMessage} />
              {!activeEdition ? (
                <p className="py-4 text-sm text-muted-foreground">Aucune edition active. Creez d&apos;abord une edition pour configurer les dates.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="start_date" className="mb-1.5 block text-sm font-medium text-foreground">Date de debut</label>
                      <input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label htmlFor="end_date" className="mb-1.5 block text-sm font-medium text-foreground">Date de fin</label>
                      <input id="end_date" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)}
                        className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>
                  {days.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Clock className="h-4 w-4" />
                          Horaires par journee
                        </h3>
                        {days.length > 1 && (
                          <button type="button" onClick={applyToAllDays}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                            <Copy className="h-3.5 w-3.5" />
                            Appliquer le 1er jour a tous
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-border rounded-md border border-border">
                        {days.map((day) => {
                          const hours = getHoursForDay(day);
                          return (
                            <div key={day} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                              <span className="min-w-[160px] text-sm font-medium text-foreground">{formatDayLabel(day)}</span>
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-muted-foreground">Ouverture</label>
                                <input type="time" value={hours.opens_at} onChange={(e) => updateHoursForDay(day, 'opens_at', e.target.value)}
                                  className="rounded-md border border-border bg-background py-1.5 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-muted-foreground">Fermeture</label>
                                <input type="time" value={hours.closes_at} onChange={(e) => updateHoursForDay(day, 'closes_at', e.target.value)}
                                  className="rounded-md border border-border bg-background py-1.5 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <button type="button" onClick={handleSaveEdition} disabled={isSavingEdition}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                      {isSavingEdition ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Enregistrer les dates
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Organizer Identity */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Building className="h-5 w-5" />
                Identification de l'organisateur
              </h2>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Nom de l'entite <span className="text-destructive">*</span></label>
                    <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Association / Societe / Mairie..."
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Type <span className="text-destructive">*</span></label>
                    <select value={orgType} onChange={(e) => setOrgType(e.target.value)}
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="">Selectionner</option>
                      <option value="association">Association</option>
                      <option value="societe">Societe (SAS, SARL, EURL...)</option>
                      <option value="micro">Micro-entreprise</option>
                      <option value="mairie">Mairie</option>
                      <option value="departement">Departement</option>
                      <option value="region">Region</option>
                      <option value="public">Autre entite publique</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">SIRET <span className="text-destructive">*</span></label>
                    <input type="text" value={orgSiret} onChange={(e) => setOrgSiret(e.target.value)} placeholder="123 456 789 00012"
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">RNA (associations)</label>
                    <input type="text" value={orgRna} onChange={(e) => setOrgRna(e.target.value)} placeholder="W123456789"
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Adresse du siege <span className="text-destructive">*</span></label>
                  <input type="text" value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} placeholder="12 rue de la Convention, 75015 Paris"
                    className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Email de contact <span className="text-destructive">*</span></label>
                    <input type="email" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} placeholder="contact@organisation.fr"
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Telephone de contact</label>
                    <input type="tel" value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} placeholder="01 23 45 67 89"
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">IBAN</label>
                    <input type="text" value={orgIban} onChange={(e) => setOrgIban(e.target.value)} placeholder="FR76 1234 5678 9012 3456 7890 123"
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Assurance</label>
                    <input type="text" value={orgInsurance} onChange={(e) => setOrgInsurance(e.target.value)} placeholder="N° contrat / assureur"
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Globe className="h-5 w-5" />
                Liens et reseaux sociaux
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Site web</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.example.com"
                      className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Instagram</label>
                    <input type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..."
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Facebook</label>
                    <input type="url" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..."
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Twitter / X</label>
                    <input type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/..."
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Discord</label>
                    <input type="url" value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="https://discord.gg/..."
                      className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Users className="h-5 w-5" />
                Membres de l&apos;equipe ({members.length})
              </h2>

              {/* Search & Add User by Email */}
              <div className="mb-5 rounded-lg border border-dashed border-border p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <UserPlus className="h-4 w-4" />
                  Ajouter un membre par email
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      placeholder="Rechercher par email..."
                      className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="volunteer">Benevole</option>
                    <option value="exhibitor">Exposant</option>
                    <option value="moderator">Moderateur</option>
                    <option value="editor">Editeur</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {searching && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recherche...
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-3 divide-y divide-border rounded-md border border-border">
                    {searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.display_name || user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        {user.is_member ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <Check className="h-3 w-3" /> Membre
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={addingUserId === user.id}
                            onClick={() => handleAddMember(user.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                          >
                            {addingUserId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                            Ajouter
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {searchEmail.length >= 3 && !searching && searchResults.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">Aucun utilisateur trouve.</p>
                )}
              </div>

              {/* Invite Link Generator */}
              <div className="mb-5 rounded-lg border border-dashed border-border p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ExternalLink className="h-4 w-4" />
                  Lien d&apos;invitation
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Role</label>
                    <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="volunteer">Benevole</option>
                      <option value="exhibitor">Exposant</option>
                      <option value="moderator">Moderateur</option>
                      <option value="editor">Editeur</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Utilisations max (0 = illimite)</label>
                    <input type="number" min={0} value={inviteMaxUses} onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                      className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Expire dans (jours)</label>
                    <input type="number" min={1} value={inviteExpiresDays} onChange={(e) => setInviteExpiresDays(Number(e.target.value))}
                      className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <button type="button" onClick={handleCreateInvite} disabled={creatingInvite}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                    {creatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                    Generer
                  </button>
                </div>

                {/* Active invites */}
                {invites.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {invites.map((inv) => {
                      const now = Math.floor(Date.now() / 1000);
                      const expired = inv.expires_at ? inv.expires_at < now : false;
                      const exhausted = inv.max_uses > 0 && inv.use_count >= inv.max_uses;
                      const inactive = expired || exhausted;

                      return (
                        <div key={inv.id} className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${inactive ? 'border-border/50 opacity-50' : 'border-border'}`}>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">{inv.role}</span>
                              <span className="text-xs text-muted-foreground">
                                {inv.use_count} utilisation{inv.use_count !== 1 ? 's' : ''}
                                {inv.max_uses > 0 ? ` / ${inv.max_uses}` : ''}
                              </span>
                              {inv.expires_at && (
                                <span className="text-xs text-muted-foreground">
                                  — {expired ? 'Expire' : `Expire le ${new Date(inv.expires_at * 1000).toLocaleDateString('fr-FR')}`}
                                </span>
                              )}
                            </div>
                            <code className="max-w-xs truncate text-xs text-muted-foreground">{getInviteUrl(inv.token)}</code>
                          </div>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => handleCopyInvite(inv)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Copier le lien">
                              {copiedInviteId === inv.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <button type="button" onClick={() => handleDeleteInvite(inv.id)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Revoquer">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Member list */}
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : members.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Aucun membre.</p>
              ) : (
                <div className="divide-y divide-border">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{member.display_name || member.username || member.user_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.email && <span className="mr-2">{member.email}</span>}
                            Role : <span className="capitalize">{member.role}</span>
                            {' — '}Rejoint le {new Date(Number(member.joined_at) * 1000).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      {member.role !== 'owner' && (
                        <button type="button" onClick={() => handleRemoveMember(member.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Retirer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="rounded-xl border border-destructive/30 bg-card p-6">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Zone dangereuse
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">Attention, ces actions sont irreversibles.</p>
              <div className="flex gap-3">
                <button type="button" onClick={handleArchive} disabled={status === 'archived'}
                  className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50">
                  Archiver le festival
                </button>
                <button type="button" onClick={handleDeleteFestival} disabled={isDeleting}
                  className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50">
                  {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Supprimer le festival
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button type="submit" disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer les parametres
              </button>
            </div>
          </form>
        </>
      )}

      {/* ═══════════════════════ TAB: THEME ═══════════════════════ */}
      {activeTab === 'theme' && (
        <>
          <FeedbackBanner msg={message} />
          <form onSubmit={handleSaveTheme} className="space-y-8">
            {/* Colors */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Palette className="h-5 w-5" />
                Couleurs
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <ColorField label="Principale" value={primaryColor} onChange={setPrimaryColor} />
                <ColorField label="Secondaire" value={secondaryColor} onChange={setSecondaryColor} />
                <ColorField label="Accentuation" value={accentColor} onChange={setAccentColor} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <ColorField label="Arriere-plan" value={bgColor} onChange={setBgColor} />
                <ColorField label="Texte" value={textColor} onChange={setTextColor} />
              </div>
              {/* Preview */}
              <div className="mt-5 rounded-lg border border-border p-4" style={{ backgroundColor: bgColor }}>
                <p className="text-xs font-medium text-muted-foreground mb-2">Apercu</p>
                <div className="flex items-center gap-3 mb-3">
                  {[primaryColor, secondaryColor, accentColor].map((c, i) => (
                    <div key={i} className="h-8 w-16 rounded-md shadow-sm" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="text-sm font-semibold" style={{ color: textColor, fontFamily: themeFont }}>
                  Titre d&apos;exemple en {themeFont}
                </p>
                <p className="text-xs mt-1" style={{ color: textColor, fontFamily: themeFont, opacity: 0.7 }}>
                  Texte de description du festival avec la police selectionnee.
                </p>
              </div>
            </div>

            {/* Typography */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Type className="h-5 w-5" />
                Typographie
              </h2>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Police de caracteres</label>
                <select value={themeFont} onChange={(e) => setThemeFont(e.target.value)}
                  className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ fontFamily: themeFont }}>
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Header Style */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Eye className="h-5 w-5" />
                Style de l&apos;en-tete
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {HEADER_STYLES.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setHeaderStyle(style.value)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      headerStyle === style.value
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{style.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{style.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Images */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Globe className="h-5 w-5" />
                Images
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">URL du logo</label>
                  <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..."
                    className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  {logoUrl && (
                    <div className="mt-2 inline-block rounded-md border border-border p-2 bg-muted/30">
                      <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">URL de la banniere</label>
                  <input type="url" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://..."
                    className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  {bannerUrl && (
                    <div className="mt-2 rounded-md border border-border overflow-hidden">
                      <img src={bannerUrl} alt="Banniere" className="h-32 w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom CSS */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Palette className="h-5 w-5" />
                CSS personnalise
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Ajoutez du CSS personnalise pour affiner l&apos;apparence du site public. Utilise avec precaution.
              </p>
              <textarea
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                rows={8}
                placeholder=".festival-header { ... }"
                className="w-full rounded-md border border-border bg-background py-2.5 px-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button type="submit" disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer le theme
              </button>
            </div>
          </form>
        </>
      )}

      {/* ═══════════════════════ TAB: COMMUNICATION ═══════════════════════ */}
      {activeTab === 'communication' && (
        <CommPanel festival={festival} members={members} setFestival={setFestival} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Communication Panel (self-contained with sub-tabs)
// ═══════════════════════════════════════════════════════════════════════════

type CommSubTab = 'campaigns' | 'emailing' | 'settings';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  recipient_type: string;
  recipient_roles: string[];
  status: string;
  scheduled_at: number | null;
  sent_at: number | null;
  sent_count: number;
  created_at: number;
}

const COMM_TABS: { id: CommSubTab; label: string; icon: typeof Mail }[] = [
  { id: 'campaigns', label: 'Campagnes', icon: Calendar },
  { id: 'emailing', label: 'Emailing', icon: Send },
  { id: 'settings', label: 'Parametre', icon: Settings },
];

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Programmee', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  sending: { label: 'En cours', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  sent: { label: 'Envoyee', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  failed: { label: 'Echouee', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const FESTIVAL_ROLES = ['owner', 'admin', 'editor', 'moderator', 'volunteer', 'exhibitor'];

function CommPanel({ festival, members, setFestival }: {
  festival: Festival;
  members: FestivalMember[];
  setFestival: (f: Festival) => void;
}) {
  const [subTab, setSubTab] = useState<CommSubTab>('campaigns');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Campaigns state ──
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [campName, setCampName] = useState('');
  const [campSubject, setCampSubject] = useState('');
  const [campBody, setCampBody] = useState('');
  const [campRecipientType, setCampRecipientType] = useState('all_members');
  const [campRoles, setCampRoles] = useState<string[]>([]);
  const [campScheduledAt, setCampScheduledAt] = useState('');
  const [isSavingCamp, setIsSavingCamp] = useState(false);

  // ── Emailing state ──
  const [emailTo, setEmailTo] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // ── SMTP state ──
  const [smtpHost, setSmtpHost] = useState(festival.email_config?.host || '');
  const [smtpPort, setSmtpPort] = useState(festival.email_config?.port || 587);
  const [smtpUser, setSmtpUser] = useState(festival.email_config?.user || '');
  const [smtpPass, setSmtpPass] = useState(festival.email_config?.pass || '');
  const [smtpFromEmail, setSmtpFromEmail] = useState(festival.email_config?.from_email || '');
  const [smtpFromName, setSmtpFromName] = useState(festival.email_config?.from_name || '');
  const [smtpEncryption, setSmtpEncryption] = useState<'tls' | 'ssl' | 'none'>(festival.email_config?.encryption || 'tls');
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Load campaigns
  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    const res = await api.get<Campaign[]>(`/emails/festival/${festival.id}/campaigns`);
    if (res.success && res.data) setCampaigns(res.data);
    setLoadingCampaigns(false);
  }, [festival.id]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleCreateCampaign = async () => {
    if (!campName.trim() || !campSubject.trim()) return;
    setIsSavingCamp(true);
    setMsg(null);
    const res = await api.post(`/emails/festival/${festival.id}/campaigns`, {
      name: campName.trim(),
      subject: campSubject.trim(),
      html_body: campBody,
      recipient_type: campRecipientType,
      recipient_roles: campRecipientType === 'specific_roles' ? campRoles : undefined,
      scheduled_at: campScheduledAt ? Math.floor(new Date(campScheduledAt).getTime() / 1000) : undefined,
    });
    if (res.success) {
      setMsg({ type: 'success', text: 'Campagne creee.' });
      setCampName(''); setCampSubject(''); setCampBody(''); setCampScheduledAt('');
      setShowNewCampaign(false);
      fetchCampaigns();
    } else {
      setMsg({ type: 'error', text: res.error || 'Erreur.' });
    }
    setIsSavingCamp(false);
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return;
    const res = await api.delete(`/emails/campaigns/${id}`);
    if (res.success) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleSendEmailing = async () => {
    if (!emailTo.length || !emailSubject.trim() || !emailBody.trim()) return;
    setIsSendingEmail(true);
    setMsg(null);
    const res = await api.post(`/emails/festival/${festival.id}/send`, {
      recipient_ids: emailTo,
      subject: emailSubject.trim(),
      html_body: emailBody,
    });
    if (res.success) {
      const data = res.data as { queued: number; message: string };
      setMsg({ type: 'success', text: data.message || 'Emails envoyes.' });
      setEmailTo([]); setEmailSubject(''); setEmailBody('');
    } else {
      setMsg({ type: 'error', text: res.error || 'Erreur.' });
    }
    setIsSendingEmail(false);
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    setMsg(null);
    const emailConfig: EmailConfig = {
      host: smtpHost.trim(), port: smtpPort, user: smtpUser.trim(), pass: smtpPass,
      from_email: smtpFromEmail.trim(), from_name: smtpFromName.trim(), encryption: smtpEncryption,
    };
    const res = await api.put(`/festivals/${festival.id}`, { email_config: emailConfig });
    if (res.success) {
      setMsg({ type: 'success', text: 'Configuration enregistree.' });
      if (res.data && typeof res.data === 'object') setFestival(res.data as Festival);
    } else {
      setMsg({ type: 'error', text: res.error || 'Erreur.' });
    }
    setIsSavingSmtp(false);
  };

  const handleSendTest = async () => {
    if (!testEmailTo.trim()) return;
    setIsSendingTest(true);
    setMsg(null);
    const res = await api.post(`/festivals/${festival.id}/test-email`, { to: testEmailTo.trim() });
    if (res.success) setMsg({ type: 'success', text: `Email de test envoye a ${testEmailTo}.` });
    else setMsg({ type: 'error', text: res.error || 'Echec.' });
    setIsSendingTest(false);
  };

  const toggleRecipient = (userId: string) => {
    setEmailTo((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const FeedbackBanner = ({ m }: { m: typeof msg }) => {
    if (!m) return null;
    return (
      <div className={`mb-6 rounded-md border px-4 py-3 text-sm ${
        m.type === 'success'
          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
      }`}>{m.text}</div>
    );
  };

  const inputCls = 'w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <>
      {/* Sub-tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        {COMM_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} type="button" onClick={() => { setSubTab(tab.id); setMsg(null); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                subTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="h-4 w-4" />{tab.label}
            </button>
          );
        })}
      </div>

      <FeedbackBanner m={msg} />

      {/* ── Campagnes ── */}
      {subTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Programmez des campagnes d&apos;emailing vers vos membres.</p>
            <button type="button" onClick={() => setShowNewCampaign(!showNewCampaign)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              + Nouvelle campagne
            </button>
          </div>

          {showNewCampaign && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Creer une campagne</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                  <input type="text" value={campName} onChange={(e) => setCampName(e.target.value)} placeholder="Ex: Lancement billetterie" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Objet de l&apos;email</label>
                  <input type="text" value={campSubject} onChange={(e) => setCampSubject(e.target.value)} placeholder="Ex: Ouverture des inscriptions !" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Contenu</label>
                <RichTextEditor value={campBody} onChange={setCampBody} placeholder="Redigez le contenu de votre campagne..." minHeight={200} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Destinataires</label>
                  <select value={campRecipientType} onChange={(e) => setCampRecipientType(e.target.value)} className={inputCls}>
                    <option value="all_members">Tous les membres</option>
                    <option value="specific_roles">Roles specifiques</option>
                  </select>
                  {campRecipientType === 'specific_roles' && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {FESTIVAL_ROLES.map((role) => (
                        <button key={role} type="button"
                          onClick={() => setCampRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role])}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            campRoles.includes(role) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                          }`}>
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Programmer l&apos;envoi</label>
                  <input type="datetime-local" value={campScheduledAt} onChange={(e) => setCampScheduledAt(e.target.value)} className={inputCls} />
                  <p className="mt-1 text-xs text-muted-foreground">Laissez vide pour enregistrer en brouillon.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewCampaign(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Annuler</button>
                <button type="button" onClick={handleCreateCampaign} disabled={isSavingCamp || !campName.trim() || !campSubject.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSavingCamp && <Loader2 className="h-4 w-4 animate-spin" />}
                  Creer
                </button>
              </div>
            </div>
          )}

          {/* Campaign list */}
          {loadingCampaigns ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <Mail className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">Aucune campagne. Creez-en une pour commencer.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((camp) => {
                const st = STATUS_LABELS[camp.status] || STATUS_LABELS.draft;
                return (
                  <div key={camp.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{camp.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Objet : {camp.subject}
                        {camp.scheduled_at && ` — Programme le ${new Date(camp.scheduled_at * 1000).toLocaleString('fr-FR')}`}
                        {camp.sent_count > 0 && ` — ${camp.sent_count} envoye(s)`}
                      </p>
                    </div>
                    <button type="button" onClick={() => handleDeleteCampaign(camp.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Emailing direct ── */}
      {subTab === 'emailing' && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">Envoyez un email ponctuel a des membres selectionnes.</p>

          {/* Recipient picker */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="h-4 w-4" />
              Destinataires ({emailTo.length} selectionne{emailTo.length > 1 ? 's' : ''})
            </h3>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun membre dans l&apos;equipe.</p>
            ) : (
              <>
                <div className="mb-2 flex gap-2">
                  <button type="button" onClick={() => setEmailTo(members.map((m) => m.user_id))}
                    className="text-xs text-primary hover:underline">Tout selectionner</button>
                  <button type="button" onClick={() => setEmailTo([])}
                    className="text-xs text-muted-foreground hover:underline">Tout deselectionner</button>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-md border border-border">
                  {members.map((m) => (
                    <label key={m.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent">
                      <input type="checkbox" checked={emailTo.includes(m.user_id)}
                        onChange={() => toggleRecipient(m.user_id)}
                        className="rounded border-border" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{m.display_name || m.username || m.user_id}</p>
                        <p className="text-xs text-muted-foreground">{m.email} — {m.role}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Compose */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Mail className="h-4 w-4" />
              Composer l&apos;email
            </h3>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Objet</label>
              <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Objet de l'email" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Contenu</label>
              <RichTextEditor value={emailBody} onChange={setEmailBody} placeholder="Redigez votre email..." minHeight={200} />
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={handleSendEmailing}
                disabled={isSendingEmail || !emailTo.length || !emailSubject.trim() || !emailBody.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer ({emailTo.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Parametre SMTP ── */}
      {subTab === 'settings' && (
        <form onSubmit={handleSaveSmtp} className="space-y-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Server className="h-5 w-5" />
              Configuration SMTP
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Configurez un serveur SMTP pour envoyer des emails au nom de votre festival.
            </p>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Serveur SMTP</label>
                  <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Port</label>
                  <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} placeholder="587" className={inputCls} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Utilisateur</label>
                  <input type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="user@example.com" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Mot de passe</span>
                  </label>
                  <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="••••••••" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Chiffrement</label>
                <select value={smtpEncryption} onChange={(e) => setSmtpEncryption(e.target.value as 'tls' | 'ssl' | 'none')} className={inputCls}>
                  <option value="tls">STARTTLS (port 587)</option>
                  <option value="ssl">SSL/TLS (port 465)</option>
                  <option value="none">Aucun (port 25)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Mail className="h-5 w-5" />
              Identite de l&apos;expediteur
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nom de l&apos;expediteur</label>
                <input type="text" value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)} placeholder="Mon Festival" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Email d&apos;envoi (From)</label>
                <input type="email" value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)} placeholder="noreply@monfestival.com" className={inputCls} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Send className="h-5 w-5" />
              Tester la configuration
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">Envoyez un email de test pour verifier votre configuration.</p>
            <div className="flex gap-3">
              <input type="email" value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} placeholder="votre@email.com" className={`flex-1 ${inputCls}`} />
              <button type="button" onClick={handleSendTest} disabled={isSendingTest || !testEmailTo.trim() || !smtpHost.trim()}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
                {isSendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Tester
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={isSavingSmtp}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isSavingSmtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
          </div>
        </form>
      )}
    </>
  );
}
