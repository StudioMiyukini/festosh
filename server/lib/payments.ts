/**
 * Payment provider abstraction.
 *
 * If STRIPE_SECRET_KEY env var is set, real Stripe PaymentIntents are used
 * (via direct fetch — no SDK dependency). Otherwise a "mock" provider is used,
 * which auto-confirms the intent after a short delay — useful for development
 * and demos before the merchant has plugged in Stripe.
 */

export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount_cents: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'failed';
  provider: 'stripe' | 'mock';
}

export interface CreateIntentParams {
  amount_cents: number;
  currency: string;
  order_id: string;
  customer_email: string;
  metadata?: Record<string, string>;
}

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

/**
 * Create a PaymentIntent.
 */
export async function createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntent> {
  if (STRIPE_KEY) {
    return createStripePaymentIntent(params);
  }
  return createMockPaymentIntent(params);
}

/**
 * Retrieve / verify a PaymentIntent.
 */
export async function retrievePaymentIntent(intentId: string): Promise<PaymentIntent | null> {
  if (STRIPE_KEY && intentId.startsWith('pi_')) {
    return retrieveStripePaymentIntent(intentId);
  }
  return retrieveMockPaymentIntent(intentId);
}

// ─── Stripe via direct fetch (no SDK install) ──────────────────────────────

async function createStripePaymentIntent(params: CreateIntentParams): Promise<PaymentIntent> {
  const body = new URLSearchParams({
    amount: String(params.amount_cents),
    currency: params.currency.toLowerCase(),
    'automatic_payment_methods[enabled]': 'true',
    'metadata[order_id]': params.order_id,
    receipt_email: params.customer_email,
  });
  for (const [k, v] of Object.entries(params.metadata || {})) {
    body.set(`metadata[${k}]`, v);
  }
  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as {
    id: string; client_secret: string; amount: number; currency: string; status: string;
  };
  return {
    id: data.id,
    client_secret: data.client_secret,
    amount_cents: data.amount,
    currency: data.currency.toUpperCase(),
    status: data.status as PaymentIntent['status'],
    provider: 'stripe',
  };
}

async function retrieveStripePaymentIntent(intentId: string): Promise<PaymentIntent | null> {
  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${intentId}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    id: string; client_secret: string; amount: number; currency: string; status: string;
  };
  return {
    id: data.id,
    client_secret: data.client_secret,
    amount_cents: data.amount,
    currency: data.currency.toUpperCase(),
    status: data.status as PaymentIntent['status'],
    provider: 'stripe',
  };
}

// ─── Mock provider (auto-confirms in dev) ─────────────────────────────────
// In-memory store so retrieval works within the same process.

interface MockIntent extends PaymentIntent { confirmedAt?: number }
const MOCK_INTENTS = new Map<string, MockIntent>();

function createMockPaymentIntent(params: CreateIntentParams): PaymentIntent {
  const id = 'mock_' + Math.random().toString(36).slice(2, 14);
  const intent: MockIntent = {
    id,
    client_secret: id + '_secret_' + Math.random().toString(36).slice(2, 8),
    amount_cents: params.amount_cents,
    currency: params.currency.toUpperCase(),
    status: 'requires_confirmation',
    provider: 'mock',
  };
  MOCK_INTENTS.set(id, intent);
  return intent;
}

function retrieveMockPaymentIntent(intentId: string): PaymentIntent | null {
  return MOCK_INTENTS.get(intentId) || null;
}

/**
 * Mock-only helper: mark an intent as succeeded. Real Stripe flow uses webhooks
 * + client-side confirmation; the mock simulates that by being called from the
 * "confirm" endpoint.
 */
export function confirmMockIntent(intentId: string): PaymentIntent | null {
  const intent = MOCK_INTENTS.get(intentId);
  if (!intent) return null;
  intent.status = 'succeeded';
  intent.confirmedAt = Date.now();
  return intent;
}

export const PAYMENT_PROVIDER_IN_USE = STRIPE_KEY ? 'stripe' : 'mock';
