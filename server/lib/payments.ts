/**
 * Payment provider abstraction.
 *
 * If STRIPE_SECRET_KEY env var is set, real Stripe PaymentIntents are used
 * (via direct fetch — no SDK dependency). Otherwise a "mock" provider is used,
 * which auto-confirms the intent after a short delay — useful for development
 * and demos before the merchant has plugged in Stripe.
 */

import crypto from 'crypto';

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

// ─── Mock provider (stateless — auto-confirms via the order row) ──────────
// In a previous iteration mock intents lived in a Map<string, MockIntent>,
// which meant a server restart between checkout and confirm orphaned the
// order forever. The mock is now stateless: createMockPaymentIntent returns
// a deterministic-looking id, and the shop route auto-marks the order as
// succeeded on confirm without needing a server-side lookup. The id is still
// crypto-random so it is non-guessable; we use the prefix "mock_" to
// distinguish from Stripe's "pi_" so retrievePaymentIntent can route.

function createMockPaymentIntent(params: CreateIntentParams): PaymentIntent {
  const id = 'mock_' + crypto.randomBytes(12).toString('hex');
  const secret = crypto.randomBytes(16).toString('hex');
  return {
    id,
    client_secret: `${id}_secret_${secret}`,
    amount_cents: params.amount_cents,
    currency: params.currency.toUpperCase(),
    status: 'requires_confirmation',
    provider: 'mock',
  };
}

/**
 * Returns true if this looks like a mock intent that we can finalise
 * without making a network call.
 */
export function isMockIntentId(intentId: string): boolean {
  return intentId.startsWith('mock_');
}

export const PAYMENT_PROVIDER_IN_USE = STRIPE_KEY ? 'stripe' : 'mock';
