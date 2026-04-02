import { useState, useRef } from 'react';
import { Upload, FileText, Image, X, Loader2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import type { UserDocument } from '@/stores/auth-store';
import type { DocumentType } from '@/types/enums';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  kbis: 'Extrait KBIS',
  insurance: 'Attestation d\'assurance',
  id_card: 'Piece d\'identite',
  association_registration: 'Immatriculation association',
  other: 'Autre document',
};

interface DocumentUploadProps {
  onUploaded: (doc: UserDocument) => void;
  maxSizeMB?: number;
}

export function DocumentUpload({ onUploaded, maxSizeMB = 10 }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>('other');
  const [label, setLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Le fichier est trop volumineux (max ${maxSizeMB} Mo).`);
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Type de fichier non accepte. Formats autorises : PDF, JPEG, PNG, WebP.');
      return;
    }

    setIsUploading(true);

    const result = await authService.uploadDocument(file, documentType, label || undefined);

    if (result.data) {
      onUploaded(result.data);
      setLabel('');
      setDocumentType('other');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setError(result.error?.message || 'Echec de l\'envoi.');
    }

    setIsUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="docType" className="mb-1 block text-xs font-medium text-foreground">
            Type de document
          </label>
          <select
            id="docType"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, l]) => (
              <option key={value} value={value}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="docLabel" className="mb-1 block text-xs font-medium text-foreground">
            Libelle (facultatif)
          </label>
          <input
            id="docLabel"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Assurance RC Pro 2026"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/30 hover:bg-accent/30'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {isUploading ? 'Envoi en cours...' : 'Glissez un fichier ici ou cliquez pour parcourir'}
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, JPEG, PNG, WebP &middot; Max {maxSizeMB} Mo
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

export { DOCUMENT_TYPE_LABELS };
