import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { LMS_COLLECTIONS } from "@/lib/firebase-lms";

// Initialize Stripe lazily to avoid build-time errors when env var is not available
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

interface CheckoutItem {
  courseId: string;
  courseTitle: string;
  price: number; // in cents
}

interface CheckoutRequest {
  items: CheckoutItem[];
  userId?: string;
  userEmail?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, userId, userEmail } = body as CheckoutRequest;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User must be logged in to checkout" },
        { status: 401 }
      );
    }

    // Get the origin for redirect URLs
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create purchase records in Firestore
    const purchaseIds: string[] = [];
    
    if (db) {
      for (const item of items) {
        const purchaseRef = doc(collection(db, LMS_COLLECTIONS.COURSE_PURCHASES));
        const purchaseData = {
          id: purchaseRef.id,
          odUserId: userId,
          courseId: item.courseId,
          amountPaidInCents: item.price,
          paymentStatus: "pending",
          stripeSessionId: null,
          stripePaymentIntentId: null,
          purchasedAt: null,
          refundedAt: null,
          createdAt: Timestamp.now(),
        };
        await setDoc(purchaseRef, purchaseData);
        purchaseIds.push(purchaseRef.id);
      }
    }

    // Create line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.courseTitle,
          metadata: {
            courseId: item.courseId,
          },
        },
        unit_amount: item.price,
      },
      quantity: 1,
    }));

    // Create Stripe checkout session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      customer_email: userEmail || undefined,
      metadata: {
        type: "course_purchase",
        userId: userId,
        courseIds: items.map((item) => item.courseId).join(","),
        purchaseIds: purchaseIds.join(","),
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address
      billing_address_collection: "required",
    });

    // Update purchase records with session ID
    if (db) {
      for (const purchaseId of purchaseIds) {
        const purchaseRef = doc(db, LMS_COLLECTIONS.COURSE_PURCHASES, purchaseId);
        await setDoc(purchaseRef, { stripeSessionId: session.id }, { merge: true });
      }
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
