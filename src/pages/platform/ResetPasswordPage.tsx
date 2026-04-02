import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Loader2, Lock, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api-client';

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await api.post('/auth/reset-password', {
        token,
        new_password: password,
      });

      if (result.success) {
        navigate('/login', {
          replace: true,
          state: { message: 'Mot de passe reinitialise avec succes. Connectez-vous avec votre nouveau mot de passe.' },
        });
      } else {
        setError(result.error || 'Le lien de reinitialisation est invalide ou a expire.');
      }
    } catch {
      setError('Une erreur est survenue. Veuillez reessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div>
        <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
          Lien invalide
        </h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Ce lien de reinitialisation est invalide. Veuillez demander un nouveau lien.
        </p>
        <Link
          to="/forgot-password"
          className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
        >
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
        Nouveau mot de passe
      </h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Choisissez un nouveau mot de passe pour votre compte.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 caracteres"
              className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-foreground">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez votre mot de passe"
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
          Reinitialiser le mot de passe
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
