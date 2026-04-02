import { FileText, Image, Download, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { UserDocument } from '@/stores/auth-store';
import { DOCUMENT_TYPE_LABELS } from './DocumentUpload';
import { authService } from '@/services/auth.service';
import type { DocumentType, DocumentStatus } from '@/types/enums';

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  verified: { label: 'Verifie', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  rejected: { label: 'Rejete', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface DocumentListProps {
  documents: UserDocument[];
  onDelete: (id: string) => void;
}

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aucun document envoye.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {documents.map((doc) => {
        const status = STATUS_CONFIG[doc.status];
        const StatusIcon = status.icon;
        const isImage = doc.mime_type.startsWith('image/');
        const downloadUrl = authService.getDocumentDownloadUrl(doc.id);

        return (
          <div key={doc.id} className="flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              {isImage ? (
                <Image className="h-5 w-5 text-muted-foreground" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {doc.label || doc.file_name}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType] || doc.document_type}</span>
                <span>&middot;</span>
                <span>{formatFileSize(doc.size_bytes)}</span>
                <span>&middot;</span>
                <span>{formatDate(doc.created_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>

              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Telecharger"
              >
                <Download className="h-4 w-4" />
              </a>

              <button
                type="button"
                onClick={() => onDelete(doc.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
