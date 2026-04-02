import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, LogIn } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function JoinInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login'>('loading');
  const [message, setMessage] = useState('');
  const [festivalId, setFestivalId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage("Lien d'invitation invalide.");
      return;
    }

    if (!isAuthenticated) {
      setStatus('login');
      return;
    }

    const joinFestival = async () => {
      setStatus('loading');
      const res = await api.post<{ festival_id: string; role: string; message: string }>(
        `/invites/join/${token}`
      );
      if (res.success && res.data) {
        setStatus('success');
        setMessage(res.data.message || 'Vous avez rejoint le festival !');
        setFestivalId(res.data.festival_id);
      } else {
        setStatus('error');
        setMessage(res.error || "Erreur lors de l'utilisation de l'invitation.");
      }
    };

    joinFestival();
  }, [token, isAuthenticated]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-lg">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <h1 className="text-xl font-bold text-foreground">Invitation en cours...</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Veuillez patienter pendant que nous traitons votre invitation.
            </p>
          </>
        )}

        {status === 'login' && (
          <>
            <LogIn className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Connexion requise</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vous devez etre connecte pour accepter cette invitation.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/join/${token}`)}`)}
                className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => navigate(`/signup?redirect=${encodeURIComponent(`/join/${token}`)}`)}
                className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Creer un compte
              </button>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <h1 className="text-xl font-bold text-foreground">Bienvenue !</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mt-6 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Aller au tableau de bord
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h1 className="text-xl font-bold text-foreground">Invitation invalide</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Retour a l&apos;accueil
            </button>
          </>
        )}
      </div>
    </div>
  );
}
