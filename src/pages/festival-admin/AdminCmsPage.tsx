import { Plus, FileText, MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';

// TODO: Wire up to service layer - fetch CMS pages from cms service

const PLACEHOLDER_PAGES = [
  {
    id: '1',
    title: 'Accueil',
    slug: 'accueil',
    status: 'published' as const,
    updatedAt: '2026-03-25',
  },
  {
    id: '2',
    title: 'A propos',
    slug: 'a-propos',
    status: 'published' as const,
    updatedAt: '2026-03-24',
  },
  {
    id: '3',
    title: 'Reglement interieur',
    slug: 'reglement',
    status: 'draft' as const,
    updatedAt: '2026-03-20',
  },
  {
    id: '4',
    title: 'Informations pratiques',
    slug: 'infos-pratiques',
    status: 'published' as const,
    updatedAt: '2026-03-18',
  },
];

export function AdminCmsPage() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contenu CMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les pages de contenu de votre festival.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Creer une page
        </button>
      </div>

      {/* Pages List */}
      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Titre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Mis a jour
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PLACEHOLDER_PAGES.map((page) => (
                <tr key={page.id} className="hover:bg-muted/50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{page.title}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    /{page.slug}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        page.status === 'published'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}
                    >
                      {page.status === 'published' ? 'Publie' : 'Brouillon'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {page.updatedAt}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* TODO: Wire up to service layer - implement page actions */}
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Voir"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
