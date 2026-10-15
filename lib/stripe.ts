/**
 * Stripe Configuration and Utilities
 */

import Stripe from "stripe";

// Server-side Stripe instance - only initialize if key is available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      typescript: true,
    })
  : null;

// Check if Stripe is configured
export const isStripeConfigured = (): boolean => {
  return !!stripeSecretKey && stripe !== null;
};

// Stripe configuration
export const STRIPE_CONFIG = {
  currency: "usd",
  paymentMethods: ["card"],
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/events/{eventSlug}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/events/{eventSlug}`,
};

// Helper to format price for display
export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceInCents / 100);
}

// Helper to create Stripe product for an event
export async function createEventProduct(eventId: string, eventTitle: string): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");
  const product = await stripe.products.create({
    name: eventTitle,
    metadata: {
      eventId,
      type: "event",
    },
  });
  return product.id;
}

// Helper to create Stripe price for a ticket type
export async function createTicketPrice(
  productId: string,
  ticketTypeId: string,
  ticketName: string,
  priceInCents: number
): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: priceInCents,
    currency: STRIPE_CONFIG.currency,
    metadata: {
      ticketTypeId,
      ticketName,
    },
  });
  return price.id;
}

// Helper to create checkout session for event tickets
export interface CheckoutLineItem {
  ticketTypeId: string;
  ticketTypeName: string;
  priceInCents: number;
  quantity: number;
}

export async function createEventCheckoutSession(
  eventId: string,
  eventSlug: string,
  eventTitle: string,
  lineItems: CheckoutLineItem[],
  customerEmail?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Checkout.Session> {
  if (!stripe) throw new Error("Stripe is not configured");
  
  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lineItems.map((item) => ({
    price_data: {
      currency: STRIPE_CONFIG.currency,
      product_data: {
        name: `${eventTitle} - ${item.ticketTypeName}`,
        metadata: {
          eventId,
          ticketTypeId: item.ticketTypeId,
        },
      },
      unit_amount: item.priceInCents,
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: STRIPE_CONFIG.paymentMethods as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
    line_items: stripeLineItems,
    mode: "payment",
    success_url: STRIPE_CONFIG.successUrl.replace("{eventSlug}", eventSlug),
    cancel_url: STRIPE_CONFIG.cancelUrl.replace("{eventSlug}", eventSlug),
    customer_email: customerEmail,
    metadata: {
      eventId,
      eventSlug,
      ...metadata,
    },
    billing_address_collection: "required",
  });

  return session;
}

// Helper to retrieve checkout session
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "payment_intent"],
  });
}

// Helper to create refund
export async function createRefund(
  paymentIntentId: string,
  amountInCents?: number
): Promise<Stripe.Refund> {
  if (!stripe) throw new Error("Stripe is not configured");
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };

  if (amountInCents) {
    refundParams.amount = amountInCents;
  }

  return stripe.refunds.create(refundParams);
}

// Webhook signature verification
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ""
  );
}
