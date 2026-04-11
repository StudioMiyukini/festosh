import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Save, Loader2, Moon, Sun, Store, HandHelping, Eye, Megaphone,
  Phone, FileText, Building2, MapPin, Plus, Trash2, Globe, Shield,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import type { ExhibitorProfile, UserDocument } from '@/stores/auth-store';
import { authService } from '@/services/auth.service';
import { DocumentUpload } from '@/components/shared/DocumentUpload';
import { DocumentList } from '@/components/shared/DocumentList';
import type { UserType } from '@/types/enums';

const USER_TYPE_CONFIG: Record<UserType, { label: string; icon: typeof Eye; color: string }> = {
  visitor: { label: 'Visiteur', icon: Eye, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  volunteer: { label: 'Benevole', icon: HandHelping, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  exhibitor: { label: 'Exposant', icon: Store, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  organizer: { label: 'Organisateur', icon: Megaphone, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
};

export function ProfilePage() {
  const { isAuthenticated, isLoading, profile, setProfile } = useAuthStore();
  const navigate = useNavigate();

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');

  // Volunteer fields
  const [volunteerBio, setVolunteerBio] = useState('');
  const [volunteerSkills, setVolunteerSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  // Exhibitor fields
  const [exhibitor, setExhibitor] = useState<Partial<ExhibitorProfile>>({});
  const [socialLinks, setSocialLinks] = useState<string[]>([]);

  // Documents
  const [documents, setDocuments] = useState<UserDocument[]>([]);

  // UI
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setBirthDate(profile.birth_date ?? '');
      setDisplayName(profile.display_name ?? '');
      setBio(profile.bio ?? '');
      setPhone(profile.phone ?? '');
      setVolunteerBio(profile.volunteer_bio ?? '');
      const skills = profile.volunteer_skills;
      setVolunteerSkills(Array.isArray(skills) ? skills : typeof skills === 'string' ? (() => { try { return JSON.parse(skills); } catch { return []; } })() : []);
      if (profile.exhibitor_profile) {
        setExhibitor(profile.exhibitor_profile);
        const sl = profile.exhibitor_profile.social_links;
        setSocialLinks(Array.isArray(sl) ? sl : typeof sl === 'string' ? (() => { try { return JSON.parse(sl); } catch { return []; } })() : []);
      }
      if (profile.documents && Array.isArray(profile.documents)) {
        setDocuments(profile.documents);
      }
    }
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userType = (profile.user_type || 'visitor') as UserType;
  const typeConfig = USER_TYPE_CONFIG[userType];
  const TypeIcon = typeConfig.icon;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    const updateData: Record<string, unknown> = {
      first_name: firstName || null,
      last_name: lastName || null,
      birth_date: birthDate || null,
      display_name: displayName || null,
      bio: bio || null,
      phone: phone || null,
    };

    if (userType === 'volunteer') {
      updateData.volunteer_bio = volunteerBio || null;
      updateData.volunteer_skills = volunteerSkills;
    }

    if (userType === 'exhibitor' || userType === 'organizer') {
      const validLinks = socialLinks.filter((l) => l.trim());
      updateData.exhibitor_profile = {
        company_name: exhibitor.company_name || undefined,
        trade_name: exhibitor.trade_name || undefined,
        activity_type: exhibitor.activity_type || undefined,
        category: exhibitor.category || undefined,
        description: exhibitor.description || undefined,
        website: exhibitor.website || undefined,
        social_links: validLinks.length > 0 ? validLinks : undefined,
        legal_form: exhibitor.legal_form || undefined,
        registration_number: exhibitor.registration_number || undefined,
        siret: exhibitor.siret || undefined,
        vat_number: exhibitor.vat_number || undefined,
        insurer_name: exhibitor.insurer_name || undefined,
        insurance_contract_number: exhibitor.insurance_contract_number || undefined,
        contact_first_name: exhibitor.contact_first_name || undefined,
        contact_last_name: exhibitor.contact_last_name || undefined,
        contact_email: exhibitor.contact_email || undefined,
        contact_phone: exhibitor.contact_phone || undefined,
        address_line1: exhibitor.address_line1 || undefined,
        address_line2: exhibitor.address_line2 || undefined,
        postal_code: exhibitor.postal_code || undefined,
        city: exhibitor.city || undefined,
        country: exhibitor.country || undefined,
      };
    }

    const result = await authService.updateProfile(updateData as never);

    if (result.data) {
      setProfile(result.data);
      setSaveMessage({ type: 'success', text: 'Profil mis a jour avec succes.' });
    } else {
      setSaveMessage({ type: 'error', text: result.error?.message || 'Erreur lors de la mise a jour.' });
    }

    setIsSaving(false);
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !volunteerSkills.includes(trimmed) && volunteerSkills.length < 20) {
      setVolunteerSkills([...volunteerSkills, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setVolunteerSkills(volunteerSkills.filter((s) => s !== skill));
  };

  const handleDocumentUploaded = (doc: UserDocument) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleDocumentDelete = async (id: string) => {
    const result = await authService.deleteDocument(id);
    if (result.error) return;
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const updateExhibitor = (field: keyof ExhibitorProfile, value: string) => {
    setExhibitor((prev) => ({ ...prev, [field]: value }));
  };

  const addSocialLink = () => setSocialLinks([...socialLinks, '']);
  const removeSocialLink = (i: number) => setSocialLinks(socialLinks.filter((_, idx) => idx !== i));
  const updateSocialLink = (i: number, v: string) => {
    const updated = [...socialLinks];
    updated[i] = v;
    setSocialLinks(updated);
  };

  const toggleTheme = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('festosh-theme', newDark ? 'dark' : 'light');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">Mon profil</h1>

      {/* Avatar + badges */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-primary" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{profile.display_name || profile.username}</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <div className="mt-1 flex gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {profile.platform_role}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.color}`}>
              <TypeIcon className="h-3 w-3" />
              {typeConfig.label}
            </span>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className={`mb-6 rounded-md border px-4 py-3 text-sm ${
          saveMessage.type === 'success'
            ? 'border-primary/20 bg-primary/10 text-primary'
            : 'border-destructive/20 bg-destructive/10 text-destructive'
        }`}>
          {saveMessage.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Info */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Informations personnelles</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Nom d&apos;utilisateur</label>
              <input type="text" value={profile.username} disabled className="w-full rounded-md border border-border bg-muted py-2.5 px-4 text-sm text-muted-foreground" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dupont" className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-foreground">Prenom</label>
                <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jean" className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <div>
              <label htmlFor="birthDate" className="mb-1.5 block text-sm font-medium text-foreground">Date de naissance</label>
              <input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-foreground">Nom d&apos;affichage</label>
              <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Votre nom public" className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input type="email" value={profile.email ?? ''} disabled className="w-full rounded-md border border-border bg-muted py-2.5 px-4 text-sm text-muted-foreground" />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-foreground">Telephone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <div>
              <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-foreground">Biographie</label>
              <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Parlez-nous de vous..." className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>
          </div>
        </div>

        {/* Volunteer section */}
        {userType === 'volunteer' && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <HandHelping className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-foreground">Profil benevole</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="volunteerBio" className="mb-1.5 block text-sm font-medium text-foreground">Motivations</label>
                <textarea id="volunteerBio" value={volunteerBio} onChange={(e) => setVolunteerBio(e.target.value)} rows={3} placeholder="Pourquoi souhaitez-vous etre benevole ?" className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Competences</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    placeholder="Ajouter une competence..."
                    className="flex-1 rounded-md border border-border bg-background py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button type="button" onClick={addSkill} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    Ajouter
                  </button>
                </div>
                {volunteerSkills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {volunteerSkills.map((skill) => (
                      <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {skill}
                        <button type="button" onClick={() => removeSkill(skill)} className="ml-0.5 hover:text-green-600">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Exhibitor / Organizer professional section */}
        {(userType === 'exhibitor' || userType === 'organizer') && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              {userType === 'exhibitor' ? <Store className="h-5 w-5 text-purple-600" /> : <Megaphone className="h-5 w-5 text-orange-600" />}
              <h2 className="text-lg font-semibold text-foreground">
                {userType === 'exhibitor' ? 'Profil exposant' : 'Profil organisateur'}
              </h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Ces informations sont utilisees pour vos candidatures aupres de tous les evenements du reseau Festosh.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="epCompany" className="mb-1.5 block text-sm font-medium text-foreground">
                    {userType === 'exhibitor' ? "Nom de l'entreprise" : 'Nom de la structure'}
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input id="epCompany" type="text" value={exhibitor.company_name ?? ''} onChange={(e) => updateExhibitor('company_name', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div>
                  <label htmlFor="epTrade" className="mb-1.5 block text-sm font-medium text-foreground">Nom commercial</label>
                  <input id="epTrade" type="text" value={exhibitor.trade_name ?? ''} onChange={(e) => updateExhibitor('trade_name', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="epCategory" className="mb-1.5 block text-sm font-medium text-foreground">Categorie</label>
                  <input id="epCategory" type="text" value={exhibitor.category ?? ''} onChange={(e) => updateExhibitor('category', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label htmlFor="epActivity" className="mb-1.5 block text-sm font-medium text-foreground">Type d&apos;activite</label>
                  <input id="epActivity" type="text" value={exhibitor.activity_type ?? ''} onChange={(e) => updateExhibitor('activity_type', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div>
                <label htmlFor="epDesc" className="mb-1.5 block text-sm font-medium text-foreground">Description de l&apos;activite</label>
                <textarea id="epDesc" value={exhibitor.description ?? ''} onChange={(e) => updateExhibitor('description', e.target.value)} rows={3} placeholder="Decrivez votre activite, vos produits..." className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>

              {/* Legal info */}
              <div className="border-t border-border pt-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Informations legales</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="epLegal" className="mb-1.5 block text-sm font-medium text-foreground">Forme juridique</label>
                      <select id="epLegal" value={exhibitor.legal_form ?? ''} onChange={(e) => updateExhibitor('legal_form', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                        <option value="">-</option>
                        <option value="auto_entrepreneur">Auto-entrepreneur</option>
                        <option value="eurl_sarl">EURL / SARL / SASU / SAS / SA</option>
                        <option value="artiste_auteur">Artiste auteur</option>
                        <option value="association">Association loi 1901</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="epSiret" className="mb-1.5 block text-sm font-medium text-foreground">SIRET</label>
                      <input id="epSiret" type="text" value={exhibitor.siret ?? ''} onChange={(e) => updateExhibitor('siret', e.target.value)} placeholder="123 456 789 00012" className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="epRegNumber" className="mb-1.5 block text-sm font-medium text-foreground">Numero d&apos;immatriculation (KBIS ou INSEE)</label>
                    <input id="epRegNumber" type="text" value={exhibitor.registration_number ?? ''} onChange={(e) => updateExhibitor('registration_number', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label htmlFor="epVat" className="mb-1.5 block text-sm font-medium text-foreground">N&deg; TVA</label>
                    <input id="epVat" type="text" value={exhibitor.vat_number ?? ''} onChange={(e) => updateExhibitor('vat_number', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              </div>

              {/* Insurance */}
              <div className="border-t border-border pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Assurance</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="epInsurer" className="mb-1.5 block text-sm font-medium text-foreground">Nom de l&apos;assureur</label>
                    <input id="epInsurer" type="text" value={exhibitor.insurer_name ?? ''} onChange={(e) => updateExhibitor('insurer_name', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label htmlFor="epInsuranceContract" className="mb-1.5 block text-sm font-medium text-foreground">N&deg; contrat d&apos;assurance</label>
                    <input id="epInsuranceContract" type="text" value={exhibitor.insurance_contract_number ?? ''} onChange={(e) => updateExhibitor('insurance_contract_number', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="border-t border-border pt-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Contact professionnel</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="epFirstName" className="mb-1.5 block text-sm font-medium text-foreground">Prenom</label>
                    <input id="epFirstName" type="text" value={exhibitor.contact_first_name ?? ''} onChange={(e) => updateExhibitor('contact_first_name', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label htmlFor="epLastName" className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                    <input id="epLastName" type="text" value={exhibitor.contact_last_name ?? ''} onChange={(e) => updateExhibitor('contact_last_name', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label htmlFor="epEmail" className="mb-1.5 block text-sm font-medium text-foreground">Email pro</label>
                    <input id="epEmail" type="email" value={exhibitor.contact_email ?? ''} onChange={(e) => updateExhibitor('contact_email', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label htmlFor="epPhone" className="mb-1.5 block text-sm font-medium text-foreground">Telephone pro</label>
                    <input id="epPhone" type="tel" value={exhibitor.contact_phone ?? ''} onChange={(e) => updateExhibitor('contact_phone', e.target.value)} className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="border-t border-border pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Adresse de facturation</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="epAddr1" className="mb-1.5 block text-sm font-medium text-foreground">N&deg; et voie</label>
                    <input id="epAddr1" type="text" value={exhibitor.address_line1 ?? ''} onChange={(e) => updateExhibitor('address_line1', e.target.value)} placeholder="12 rue des Festivals" className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label htmlFor="epAddr2" className="mb-1.5 block text-sm font-medium text-foreground">Complement d&apos;adresse</label>
                    <input id="epAddr2" type="text" value={exhibitor.address_line2 ?? ''} onChange={(e) => updateExhibitor('address_line2', e.target.value)} placeholder="Batiment B, etage 3" className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="epPostal" className="mb-1.5 block text-sm font-medium text-foreground">Code postal</label>
                      <input id="epPostal" type="text" value={exhibitor.postal_code ?? ''} onChange={(e) => updateExhibitor('postal_code', e.target.value)} placeholder="75001" className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label htmlFor="epCity" className="mb-1.5 block text-sm font-medium text-foreground">Commune</label>
                      <input id="epCity" type="text" value={exhibitor.city ?? ''} onChange={(e) => updateExhibitor('city', e.target.value)} placeholder="Paris" className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Web & Social */}
              <div className="border-t border-border pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Presence en ligne</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="epWebsite" className="mb-1.5 block text-sm font-medium text-foreground">Site web</label>
                    <input id="epWebsite" type="url" value={exhibitor.website ?? ''} onChange={(e) => updateExhibitor('website', e.target.value)} placeholder="https://..." className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Reseaux sociaux</label>
                      <button type="button" onClick={addSocialLink} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                        <Plus className="h-3.5 w-3.5" /> Ajouter
                      </button>
                    </div>
                    {socialLinks.length === 0 && (
                      <p className="text-xs text-muted-foreground">Cliquez sur &laquo; Ajouter &raquo; pour renseigner vos reseaux sociaux.</p>
                    )}
                    <div className="space-y-2">
                      {socialLinks.map((link, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="url"
                            value={link}
                            onChange={(e) => updateSocialLink(i, e.target.value)}
                            placeholder="https://instagram.com/votre-compte"
                            className="flex-1 rounded-md border border-border bg-background py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          <button type="button" onClick={() => removeSocialLink(i)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents section (exhibitor + organizer) */}
        {(userType === 'exhibitor' || userType === 'organizer') && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Mes documents</h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Envoyez vos documents officiels (KBIS, assurance, piece d&apos;identite, etc.). Ils seront verifies par notre equipe.
            </p>

            <DocumentList documents={documents} onDelete={handleDocumentDelete} />

            <div className="mt-4">
              <DocumentUpload onUploaded={handleDocumentUploaded} />
            </div>
          </div>
        )}

        {/* Theme Preference */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Preferences</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Theme sombre</p>
              <p className="text-xs text-muted-foreground">Basculer entre le mode clair et sombre</p>
            </div>
            <button type="button" onClick={toggleTheme} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-accent">
              {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {isDarkMode ? 'Sombre' : 'Clair'}
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
