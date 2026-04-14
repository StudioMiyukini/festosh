import { useState, useRef } from 'react';
import { Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/api-client';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

export function ImageUploadInput({ value, onChange, placeholder = 'https://...' }: ImageUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    const res = await api.uploadFile<{ url: string }>('/media/upload', formData);

    if (res.success && res.data?.url) {
      onChange(res.data.url);
    } else {
      setError(res.error || 'Echec de l\'upload');
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {value && !value.startsWith('http') && value.startsWith('/') && (
        <div className="relative mt-1 inline-block">
          <img
            src={value}
            alt=""
            className="h-16 w-16 rounded border border-border object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
}
