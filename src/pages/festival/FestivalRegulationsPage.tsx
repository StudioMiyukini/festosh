import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Scale, Loader2, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant-store';

interface Regulation {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  is_published: number;
  requires_acceptance: number;
  version: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General', visitor: 'Visiteurs', exhibitor: 'Exposants',
  cosplay: 'Cosplay', photo_video: 'Photo / Video', volunteer: 'Benevoles',
  safety: 'Securite', food: 'Restauration', marketplace: 'Ventes',
  privacy: 'Confidentialite', other: 'Autre',
};

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700', visitor: 'bg-blue-100 text-blue-700',
  exhibitor: 'bg-amber-100 text-amber-700', cosplay: 'bg-purple-100 text-purple-700',
  photo_video: 'bg-pink-100 text-pink-700', volunteer: 'bg-green-100 text-green-700',
  safety: 'bg-red-100 text-red-700', food: 'bg-orange-100 text-orange-700',
  marketplace: 'bg-teal-100 text-teal-700', privacy: 'bg-indigo-100 text-indigo-700',
};

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="mt-6 mb-2 text-base font-semibold text-foreground">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-8 mb-3 text-lg font-bold text-foreground">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="mt-8 mb-4 text-xl font-bold text-foreground">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-muted-foreground">$1</li>')
    .replace(/\n\n/g, '</p><p class="mt-2 text-sm leading-relaxed text-muted-foreground">')
    .replace(/\n/g, '<br/>');
}

export function FestivalRegulationsPage() {
  const { festival } = useTenantStore();
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (!festival) return;
    api.get<Regulation[]>(`/regulations/festival/${festival.id}/public`).then((res) => {
      const regs = Array.isArray(res.data) ? res.data : [];
      setRegulations(regs);
      if (regs.length > 0) setActiveTab(regs[0].id);
      setLoading(false);
    });
  }, [festival]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (regulations.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Scale className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
        <h1 className="text-xl font-bold text-foreground">Reglements</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aucun reglement publie pour ce festival.
        </p>
      </div>
    );
  }

  const activeReg = regulations.find((r) => r.id === activeTab);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reglements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consultez les reglements et conditions du festival.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sidebar tabs */}
        <nav className="space-y-1">
          {regulations.map((reg) => (
            <button
              key={reg.id}
              type="button"
              onClick={() => setActiveTab(reg.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                activeTab === reg.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Scale className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate">{reg.title}</p>
                <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                  CATEGORY_COLORS[reg.category] || CATEGORY_COLORS.general
                }`}>
                  {CATEGORY_LABELS[reg.category] || reg.category}
                </span>
              </div>
              {activeTab === reg.id && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />}
            </button>
          ))}
        </nav>

        {/* Content */}
        {activeReg && (
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <div className="mb-6">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                CATEGORY_COLORS[activeReg.category] || CATEGORY_COLORS.general
              }`}>
                {CATEGORY_LABELS[activeReg.category] || activeReg.category}
              </span>
              <h2 className="mt-2 text-xl font-bold text-foreground">{activeReg.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Version {activeReg.version}</p>
            </div>

            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(activeReg.content) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
