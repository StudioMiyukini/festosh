import { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';

const CONSENT_KEY = 'festosh-cookie-consent';

type ConsentLevel = 'all' | 'essential' | null;

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Slight delay so it doesn't flash on first render
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = (level: ConsentLevel) => {
    if (!level) return;
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ level, date: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4">
      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card shadow-lg">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                Respect de votre vie privee
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Festosh utilise des cookies essentiels pour le fonctionnement du site
                (authentification, preferences). Aucun cookie de suivi ou publicitaire
                n&apos;est utilise. Vos donnees personnelles sont traitees conformement au
                RGPD et a notre{' '}
                <a href="/privacy" className="underline hover:text-foreground">
                  politique de confidentialite
                </a>
                .
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => accept('all')}
                  className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Tout accepter
                </button>
                <button
                  type="button"
                  onClick={() => accept('essential')}
                  className="rounded-md border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                >
                  Essentiels uniquement
                </button>
                <a
                  href="/privacy"
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  En savoir plus
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => accept('essential')}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
