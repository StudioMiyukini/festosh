/** Format a unix timestamp (seconds) to a localized short date string. */
export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format an amount in cents to a localized EUR currency string. */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}
