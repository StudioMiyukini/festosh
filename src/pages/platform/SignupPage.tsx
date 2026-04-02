import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, User, Mail, Lock, Eye, HandHelping, Store, Megaphone, ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { UserType } from '@/types/enums';

const USER_TYPES: { value: UserType; label: string; description: string; icon: typeof Eye }[] = [
  { value: 'visitor', label: 'Visiteur', description: 'Decouvrez les evenements et suivez vos festivals preferes.', icon: Eye },
  { value: 'volunteer', label: 'Benevole', description: 'Proposez votre aide et inscrivez-vous aux missions.', icon: HandHelping },
  { value: 'exhibitor', label: 'Exposant', description: 'Un compte unique pour postuler a tous les evenements du reseau.', icon: Store },
  { value: 'organizer', label: 'Organisateur', description: 'Creez et gerez vos propres festivals et conventions.', icon: Megaphone },
];

const LEGAL_FORMS = [
  { value: 'auto_entrepreneur', label: 'Auto-entrepreneur' },
  { value: 'eurl_sarl', label: 'EURL / SARL / SASU / SAS / SA' },
  { value: 'artiste_auteur', label: 'Artiste auteur' },
  { value: 'association', label: 'Association loi 1901' },
];

const EXHIBITOR_CATEGORIES = [
  'Artisanat', 'Art / Illustration', 'Edition / Librairie', 'Jeux de societe',
  'Jeux video', 'Cosplay / Couture', 'Figurines / Maquettes', 'Manga / Comics',
  'Nourriture / Boissons', 'Goodies / Merchandising', 'Association', 'Autre',
];

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
}

export function SignupPage() {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<UserType>('visitor');

  // Step 2: credentials
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3: identity + professional (exhibitor/organizer)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [legalForm, setLegalForm] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [siret, setSiret] = useState('');
  const [insurerName, setInsurerName] = useState('');
  const [insuranceContract, setInsuranceContract] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [socialLinks, setSocialLinks] = useState<string[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const needsStep3 = userType === 'exhibitor' || userType === 'organizer';
  const totalSteps = needsStep3 ? 3 : 2;

  const validateStep2 = (): boolean => {
    const e: FormErrors = {};
    if (!username.trim()) e.username = "Le nom d'utilisateur est requis.";
    else if (username.length < 3) e.username = "Minimum 3 caracteres.";
    else if (!/^[a-zA-Z0-9_-]+$/.test(username)) e.username = "Lettres, chiffres, tirets et underscores uniquement.";
    if (!email.trim()) e.email = "L'adresse email est requise.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email invalide.";
    if (!password) e.password = 'Le mot de passe est requis.';
    else if (password.length < 8) e.password = 'Minimum 8 caracteres.';
    if (password !== confirmPassword) e.confirmPassword = 'Les mots de passe ne correspondent pas.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = (): boolean => {
    const e: FormErrors = {};
    if (!firstName.trim()) e.firstName = 'Le prenom est requis.';
    if (!lastName.trim()) e.lastName = 'Le nom est requis.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;

    setServerError(null);
    setIsSubmitting(true);

    try {
      const data: Parameters<typeof signUp>[0] = {
        email,
        password,
        username,
        user_type: userType,
      };

      if (needsStep3) {
        data.first_name = firstName || undefined;
        data.last_name = lastName || undefined;
        data.birth_date = birthDate || undefined;
        data.company_name = companyName || undefined;
        data.category = category || undefined;
        data.legal_form = legalForm || undefined;
        data.registration_number = registrationNumber || undefined;
        data.siret = siret || undefined;
        data.insurer_name = insurerName || undefined;
        data.insurance_contract_number = insuranceContract || undefined;
        data.contact_phone = contactPhone || undefined;
        data.contact_email = contactEmail || undefined;
        data.website = website || undefined;
        data.address_line1 = addressLine1 || undefined;
        data.address_line2 = addressLine2 || undefined;
        data.postal_code = postalCode || undefined;
        data.city = city || undefined;
        const validLinks = socialLinks.filter((l) => l.trim());
        if (validLinks.length > 0) data.social_links = validLinks;
      }

      const result = await signUp(data);
      if (result.error) {
        setServerError(result.error.message || 'Erreur lors de la creation du compte.');
      } else {
        navigate(needsStep3 ? '/profile' : '/dashboard', { replace: true });
      }
    } catch {
      setServerError('Une erreur est survenue. Veuillez reessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSocialLink = () => setSocialLinks([...socialLinks, '']);
  const removeSocialLink = (i: number) => setSocialLinks(socialLinks.filter((_, idx) => idx !== i));
  const updateSocialLink = (i: number, v: string) => {
    const updated = [...socialLinks];
    updated[i] = v;
    setSocialLinks(updated);
  };

  const isLastStep = step === totalSteps;

  const inputCls = "w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
  const labelCls = "mb-1.5 block text-sm font-medium text-foreground";

  return (
    <div>
      <h2 className="mb-2 text-center text-2xl font-bold text-foreground">Inscription</h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">Creez votre compte Festosh</p>

      {/* Step indicator */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all ${i + 1 === step ? 'w-8 bg-primary' : i + 1 < step ? 'w-2 bg-primary/50' : 'w-2 bg-border'}`} />
        ))}
      </div>

      {serverError && (
        <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>
      )}

      {/* ─── Step 1: User type ─── */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="mb-4 text-center text-sm font-medium text-foreground">Quel type de compte souhaitez-vous creer ?</p>
          {USER_TYPES.map((type) => {
            const Icon = type.icon;
            const selected = userType === type.value;
            return (
              <button key={type.value} type="button" onClick={() => setUserType(type.value)}
                className={`flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-accent/50'}`}>
                <div className={`mt-0.5 rounded-lg p-2 ${selected ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Icon className={`h-5 w-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}>{type.label}</span>
                    {selected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{type.description}</p>
                </div>
              </button>
            );
          })}
          <button type="button" onClick={() => setStep(2)}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Continuer <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ─── Step 2: Credentials ─── */}
      {step === 2 && (
        <form onSubmit={(e) => { e.preventDefault(); if (isLastStep) handleSubmit(); else { if (validateStep2()) setStep(3); } }} className="space-y-4">
          <div>
            <label htmlFor="username" className={labelCls}>Nom d&apos;utilisateur</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="mon_pseudo" className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            {errors.username && <p className="mt-1 text-xs text-destructive">{errors.username}</p>}
          </div>
          <div>
            <label htmlFor="email" className={labelCls}>Adresse email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="password" className={labelCls}>Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 caracteres" className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelCls}>Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Retapez votre mot de passe" className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p>}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>
            <button type="submit" disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLastStep ? 'Creer mon compte' : 'Continuer'}
              {!isLastStep && !isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </form>
      )}

      {/* ─── Step 3: Professional info (exhibitor + organizer) ─── */}
      {step === 3 && needsStep3 && (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Completez vos informations professionnelles. Vous pourrez les modifier dans votre profil.
          </p>

          {/* Identity */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">Identite</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="lastName" className={labelCls}>Nom *</label>
                <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
                {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>}
              </div>
              <div>
                <label htmlFor="firstName" className={labelCls}>Prenom *</label>
                <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
                {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="birthDate" className={labelCls}>Date de naissance</label>
              <input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
            </div>
          </fieldset>

          {/* Billing address */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">Adresse de facturation</legend>
            <div>
              <label htmlFor="addr1" className={labelCls}>N&deg; et voie</label>
              <input id="addr1" type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="12 rue des Festivals" className={inputCls} />
            </div>
            <div>
              <label htmlFor="addr2" className={labelCls}>Complement d&apos;adresse</label>
              <input id="addr2" type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Batiment B, etage 3" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="postalCode" className={labelCls}>Code postal</label>
                <input id="postalCode" type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="75001" className={inputCls} />
              </div>
              <div>
                <label htmlFor="city" className={labelCls}>Commune</label>
                <input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" className={inputCls} />
              </div>
            </div>
          </fieldset>

          {/* Legal info */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">Informations legales</legend>
            <div>
              <label htmlFor="legalForm" className={labelCls}>Forme juridique</label>
              <select id="legalForm" value={legalForm} onChange={(e) => setLegalForm(e.target.value)} className={inputCls}>
                <option value="">Selectionnez</option>
                {LEGAL_FORMS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            {userType === 'exhibitor' && (
              <div>
                <label htmlFor="category" className={labelCls}>Categorie d&apos;activite</label>
                <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <option value="">Selectionnez</option>
                  {EXHIBITOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="companyName" className={labelCls}>
                {userType === 'exhibitor' ? "Nom de l'entreprise ou activite" : "Nom de la structure"}
              </label>
              <input id="companyName" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="regNumber" className={labelCls}>Numero d&apos;immatriculation (KBIS ou INSEE)</label>
              <input id="regNumber" type="text" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="siret" className={labelCls}>SIRET</label>
              <input id="siret" type="text" value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="123 456 789 00012" className={inputCls} />
            </div>
          </fieldset>

          {/* Insurance */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">Assurance</legend>
            <div>
              <label htmlFor="insurerName" className={labelCls}>Nom de l&apos;assureur</label>
              <input id="insurerName" type="text" value={insurerName} onChange={(e) => setInsurerName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="insuranceContract" className={labelCls}>N&deg; de contrat d&apos;assurance</label>
              <input id="insuranceContract" type="text" value={insuranceContract} onChange={(e) => setInsuranceContract(e.target.value)} className={inputCls} />
            </div>
          </fieldset>

          {/* Contact */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">Contact</legend>
            <div>
              <label htmlFor="contactPhone" className={labelCls}>Telephone de contact</label>
              <input id="contactPhone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+33 6 12 34 56 78" className={inputCls} />
            </div>
            <div>
              <label htmlFor="contactEmail" className={labelCls}>Email de contact</label>
              <input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@monactivite.fr" className={inputCls} />
            </div>
          </fieldset>

          {/* Web & social */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">Presence en ligne</legend>
            <div>
              <label htmlFor="website" className={labelCls}>Site web</label>
              <input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className={inputCls} />
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
          </fieldset>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(2)} className="flex items-center gap-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>
            <button type="submit" disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Creer mon compte
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Deja un compte ?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">Se connecter</Link>
      </p>
    </div>
  );
}
