import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Database, Eye, Trash2, Mail } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour a l&apos;accueil
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Politique de confidentialite
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Derniere mise a jour : 29 mars 2026
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-foreground">
        {/* Introduction */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Protection de vos donnees</h2>
          </div>
          <p>
            Festosh s&apos;engage a proteger la vie privee de ses utilisateurs conformement
            au Reglement General sur la Protection des Donnees (RGPD - Reglement UE 2016/679)
            et aux recommandations ISO 27001 en matiere de securite de l&apos;information.
          </p>
        </section>

        {/* Responsable du traitement */}
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des donnees est l&apos;equipe Festosh.
            Pour toute question relative a vos donnees personnelles, contactez-nous a :{' '}
            <span className="font-medium">privacy@festosh.app</span>
          </p>
        </section>

        {/* Donnees collectees */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">2. Donnees collectees</h2>
          </div>
          <p className="mb-2">Nous collectons uniquement les donnees necessaires au fonctionnement du service :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Compte utilisateur</strong> : nom d&apos;utilisateur, adresse email, mot de passe (chiffre avec bcrypt + salt)</li>
            <li><strong>Profil</strong> : nom d&apos;affichage, biographie, avatar (facultatifs)</li>
            <li><strong>Donnees festival</strong> : informations liees a la gestion de votre festival</li>
            <li><strong>Donnees techniques</strong> : adresse IP (pour la securite), navigateur (User-Agent)</li>
          </ul>
        </section>

        {/* Base legale */}
        <section>
          <h2 className="text-lg font-semibold mb-3">3. Base legale du traitement</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Execution du contrat</strong> (Art. 6.1.b RGPD) : pour fournir le service Festosh</li>
            <li><strong>Interet legitime</strong> (Art. 6.1.f RGPD) : pour la securite et la prevention des abus</li>
            <li><strong>Consentement</strong> (Art. 6.1.a RGPD) : pour les cookies non essentiels (si applicables)</li>
          </ul>
        </section>

        {/* Securite */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">4. Securite des donnees (ISO 27001)</h2>
          </div>
          <p className="mb-2">Conformement aux bonnes pratiques ISO 27001, nous appliquons les mesures suivantes :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Chiffrement</strong> : mots de passe haches avec bcrypt (12 rounds + salt unique), donnees sensibles chiffrees en AES-256-GCM</li>
            <li><strong>Transport</strong> : communications chiffrees via TLS/HTTPS avec HSTS</li>
            <li><strong>Authentification</strong> : tokens JWT signes (HS256), expiration 24h, avec identifiant unique (jti)</li>
            <li><strong>Controle d&apos;acces</strong> : systeme de roles hierarchique (RBAC) au niveau plateforme et festival</li>
            <li><strong>Protection contre les attaques</strong> : limitation de debit (rate limiting), en-tetes de securite (CSP, HSTS, X-Frame-Options)</li>
            <li><strong>Base de donnees</strong> : suppression securisee (secure_delete), cles etrangeres, validation des entrees (Zod)</li>
            <li><strong>Journalisation</strong> : logs des acces et erreurs sans donnees sensibles</li>
          </ul>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-lg font-semibold mb-3">5. Cookies</h2>
          <p className="mb-2">Festosh utilise exclusivement des cookies techniques essentiels :</p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Cookie</th>
                  <th className="px-3 py-2 text-left font-medium">Finalite</th>
                  <th className="px-3 py-2 text-left font-medium">Duree</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-3 py-2 font-mono">festosh-token</td>
                  <td className="px-3 py-2">Authentification (JWT)</td>
                  <td className="px-3 py-2">24 heures</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">festosh-auth</td>
                  <td className="px-3 py-2">Session utilisateur (profil)</td>
                  <td className="px-3 py-2">Session</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">festosh-cookie-consent</td>
                  <td className="px-3 py-2">Choix des cookies</td>
                  <td className="px-3 py-2">1 an</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-muted-foreground">
            Aucun cookie de suivi, d&apos;analyse ou publicitaire n&apos;est utilise.
          </p>
        </section>

        {/* Droits */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">6. Vos droits (RGPD)</h2>
          </div>
          <p className="mb-2">Conformement au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Droit d&apos;acces</strong> (Art. 15) : obtenir une copie de vos donnees personnelles</li>
            <li><strong>Droit de rectification</strong> (Art. 16) : corriger vos donnees via votre profil</li>
            <li><strong>Droit a l&apos;effacement</strong> (Art. 17) : demander la suppression de votre compte et donnees</li>
            <li><strong>Droit a la portabilite</strong> (Art. 20) : exporter vos donnees dans un format structure</li>
            <li><strong>Droit d&apos;opposition</strong> (Art. 21) : vous opposer au traitement de vos donnees</li>
            <li><strong>Droit de retrait du consentement</strong> (Art. 7) : retirer votre consentement a tout moment</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez-nous a{' '}
            <span className="font-medium">privacy@festosh.app</span>.
            Nous repondrons dans un delai de 30 jours.
          </p>
        </section>

        {/* Suppression */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">7. Conservation et suppression</h2>
          </div>
          <ul className="list-disc pl-6 space-y-1">
            <li>Les donnees de compte sont conservees tant que le compte est actif</li>
            <li>A la suppression du compte, toutes les donnees personnelles sont effacees sous 30 jours</li>
            <li>Les donnees de journalisation sont conservees 90 jours maximum</li>
            <li>La base de donnees utilise la suppression securisee (zero-fill) pour empecher la recuperation</li>
          </ul>
        </section>

        {/* Transferts */}
        <section>
          <h2 className="text-lg font-semibold mb-3">8. Transferts de donnees</h2>
          <p>
            Vos donnees sont hebergees en Europe. Aucun transfert de donnees hors de l&apos;Espace
            Economique Europeen (EEE) n&apos;est effectue. Nous ne vendons, ne louons et ne partageons
            pas vos donnees personnelles avec des tiers.
          </p>
        </section>

        {/* Contact */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">9. Contact</h2>
          </div>
          <p>
            Pour toute question concernant cette politique ou vos donnees personnelles :{' '}
            <span className="font-medium">privacy@festosh.app</span>
          </p>
          <p className="mt-2">
            Vous avez egalement le droit d&apos;introduire une reclamation aupres de la CNIL
            (Commission Nationale de l&apos;Informatique et des Libertes) :{' '}
            <span className="font-medium">www.cnil.fr</span>
          </p>
        </section>
      </div>
    </div>
  );
}
