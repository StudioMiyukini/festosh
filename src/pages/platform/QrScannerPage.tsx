import { useState } from 'react';
import {
  QrCode,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  Coins,
  RotateCcw,
  Ticket,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScanSuccess {
  status: 'success';
  type: string;
  type_label: string;
  name: string;
  description: string | null;
  image_url: string | null;
  xp_earned: number;
  coins_earned: number;
  is_consumable: boolean;
}

interface ScanError {
  status: 'error';
  code: 'already_scanned' | 'expired' | 'invalid' | 'limit_reached' | 'inactive';
  message: string;
}

type ScanResult = ScanSuccess | ScanError;

const TYPE_COLORS: Record<string, string> = {
  trophy: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  entry_ticket: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  drink_ticket: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  food_ticket: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  hunt_checkpoint: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  voucher: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  stamp_point: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function QrScannerPage() {
  const { profile } = useAuthStore();

  const [qrCode, setQrCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const isAuthenticated = !!profile;

  const handleScan = async () => {
    const code = qrCode.trim().toUpperCase();
    if (!code) return;
    setScanning(true);
    setResult(null);
    setShowAnimation(false);

    const payload: Record<string, string> = { qr_code: code };
    if (!isAuthenticated && guestName.trim()) {
      payload.guest_name = guestName.trim();
    }

    const res = await api.post<ScanResult>('/qr-objects/scan', payload);

    if (res.success && res.data) {
      setResult(res.data);
      if (res.data.status === 'success') {
        setShowAnimation(true);
      }
    } else {
      setResult({
        status: 'error',
        code: 'invalid',
        message: res.error || 'Code QR invalide ou erreur reseau.',
      });
    }
    setScanning(false);
  };

  const handleReset = () => {
    setQrCode('');
    setResult(null);
    setShowAnimation(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && qrCode.trim()) {
      handleScan();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.trim()) {
      // Let it paste, then auto-submit after short delay
      setTimeout(() => {
        const input = e.target as HTMLInputElement;
        const code = input.value.trim();
        if (code) {
          setQrCode(code);
        }
      }, 50);
    }
  };

  /* ---- result view ---- */

  if (result) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center">
          {result.status === 'success' ? (
            <div className="space-y-6">
              {/* Success icon */}
              <div
                className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 ${
                  showAnimation ? 'animate-bounce' : ''
                }`}
              >
                <CheckCircle2 className="h-14 w-14 text-green-600 dark:text-green-400" />
              </div>

              {/* Type badge */}
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    TYPE_COLORS[result.type] || TYPE_COLORS.custom
                  }`}
                >
                  {result.type_label}
                </span>
              </div>

              {/* Object name */}
              <h2 className="text-2xl font-bold text-foreground">{result.name}</h2>

              {/* Description */}
              {result.description && (
                <p className="text-sm text-muted-foreground">{result.description}</p>
              )}

              {/* Image */}
              {result.image_url && (
                <div className="mx-auto max-w-[200px]">
                  <img
                    src={result.image_url}
                    alt={result.name}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Rewards */}
              {(result.xp_earned > 0 || result.coins_earned > 0) && (
                <div className="flex items-center justify-center gap-4">
                  {result.xp_earned > 0 && (
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-4 py-2 text-lg font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 ${
                        showAnimation ? 'animate-pulse' : ''
                      }`}
                    >
                      <Zap className="h-5 w-5" />
                      +{result.xp_earned} XP
                    </div>
                  )}
                  {result.coins_earned > 0 && (
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-2 text-lg font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ${
                        showAnimation ? 'animate-pulse' : ''
                      }`}
                    >
                      <Coins className="h-5 w-5" />
                      +{result.coins_earned} pieces
                    </div>
                  )}
                </div>
              )}

              {/* Consumable notice */}
              {result.is_consumable && (
                <div className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <Ticket className="h-4 w-4" />
                  Ticket utilise
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Error icon */}
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-14 w-14 text-red-600 dark:text-red-400" />
              </div>

              {/* Error message */}
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Erreur</h2>
              <p className="text-sm text-muted-foreground">{result.message}</p>
            </div>
          )}

          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            <RotateCcw className="h-5 w-5" />
            Scanner un autre
          </button>
        </div>
      </div>
    );
  }

  /* ---- input view ---- */

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <QrCode className="h-10 w-10 text-primary" />
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          Scanner un QR code
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Entrez le code imprime sur votre ticket, trophee ou objet QR.
        </p>

        {/* QR code input */}
        <div className="space-y-4">
          <input
            type="text"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Entrez le code QR"
            autoFocus
            autoComplete="off"
            className="w-full rounded-xl border border-border bg-background px-4 py-4 text-center font-mono text-xl font-bold uppercase tracking-widest text-foreground placeholder:text-muted-foreground placeholder:font-normal placeholder:tracking-normal placeholder:text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          {/* Guest name (when not authenticated) */}
          {!isAuthenticated && (
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Votre nom (optionnel)"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning || !qrCode.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-green-700 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {scanning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <QrCode className="h-5 w-5" />
            )}
            Scanner
          </button>
        </div>
      </div>
    </div>
  );
}
