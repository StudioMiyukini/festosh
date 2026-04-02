import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 inline-flex rounded-full bg-muted p-6">
          <FileQuestion className="h-16 w-16 text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
        <h2 className="mb-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mb-8 text-muted-foreground">
          La page que vous recherchez n&apos;existe pas ou a ete deplacee.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
