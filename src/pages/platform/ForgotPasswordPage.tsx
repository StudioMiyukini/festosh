import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api-client';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await api.post('/auth/forgot-password', { email });
      if (result.success) {
        setSubmitted(true);
      } else {
        // Still show success for security (don't leak email existence)
        setSubmitted(true);
      }
    } catch {
      setError('Une erreur est survenue. Veuillez reessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
          Email envoye
        </h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.
          Verifiez votre boite de reception.
        </p>
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
        Mot de passe oublie
      </h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Entrez votre adresse email pour recevoir un lien de reinitialisation.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
            Adresse email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Envoyer le lien
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="flex items-center justify-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Retour a la connexion
        </Link>
      </p>
    </div>
  );
}
