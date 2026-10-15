import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  collection,
  increment,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { COLLECTIONS, type EventDoc, type EventRegistration } from "@/lib/schema";
import { LMS_COLLECTIONS, type CoursePurchaseDoc } from "@/lib/firebase-lms";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(body, signature);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Check if this is a course purchase or event registration
        if (session.metadata?.type === "course_purchase") {
          await handleCourseCheckoutCompleted(session);
        } else {
          await handleCheckoutCompleted(session);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!db) return;

  const registrationId = session.metadata?.registrationId;
  const eventId = session.metadata?.eventId;

  if (!registrationId || !eventId) {
    console.error("Missing metadata in checkout session");
    return;
  }

  // Update registration
  const regRef = doc(db, COLLECTIONS.EVENT_REGISTRATIONS, registrationId);
  const regSnap = await getDoc(regRef);

  if (!regSnap.exists()) {
    console.error("Registration not found:", registrationId);
    return;
  }

  const registration = regSnap.data() as EventRegistration;

  await updateDoc(regRef, {
    paymentStatus: "paid",
    status: "confirmed",
    stripePaymentIntentId: session.payment_intent,
    updatedAt: Timestamp.now(),
  });

  // Update ticket quantities sold
  const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
  const eventSnap = await getDoc(eventRef);

  if (eventSnap.exists()) {
    const event = eventSnap.data() as EventDoc;
    const updatedTicketTypes = event.ticketTypes?.map((ticketType) => {
      const purchasedTicket = registration.tickets.find(
        (t) => t.ticketTypeId === ticketType.id
      );
      if (purchasedTicket) {
        return {
          ...ticketType,
          quantitySold: ticketType.quantitySold + purchasedTicket.quantity,
        };
      }
      return ticketType;
    });

    // Calculate total attendees
    const totalTicketsSold = registration.tickets.reduce(
      (sum, t) => sum + t.quantity,
      0
    );

    await updateDoc(eventRef, {
      ticketTypes: updatedTicketTypes,
      currentAttendees: increment(totalTicketsSold),
      updatedAt: Timestamp.now(),
    });
  }

  console.log(`Registration ${registrationId} confirmed for event ${eventId}`);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  if (!db) return;

  const registrationId = session.metadata?.registrationId;

  if (!registrationId) return;

  const regRef = doc(db, COLLECTIONS.EVENT_REGISTRATIONS, registrationId);
  await updateDoc(regRef, {
    paymentStatus: "failed",
    status: "cancelled",
    updatedAt: Timestamp.now(),
  });

  console.log(`Registration ${registrationId} expired`);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  if (!db) return;

  // Find registration by payment intent
  const regsRef = collection(db, COLLECTIONS.EVENT_REGISTRATIONS);
  const q = query(
    regsRef,
    where("stripePaymentIntentId", "==", paymentIntent.id)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const regDoc = snapshot.docs[0];
  await updateDoc(doc(db, COLLECTIONS.EVENT_REGISTRATIONS, regDoc.id), {
    paymentStatus: "failed",
    updatedAt: Timestamp.now(),
  });

  console.log(`Payment failed for registration ${regDoc.id}`);
}

async function handleRefund(charge: Stripe.Charge) {
  if (!db) return;

  const paymentIntentId = charge.payment_intent;
  if (!paymentIntentId) return;

  // Find registration by payment intent
  const regsRef = collection(db, COLLECTIONS.EVENT_REGISTRATIONS);
  const q = query(
    regsRef,
    where("stripePaymentIntentId", "==", paymentIntentId)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const regDoc = snapshot.docs[0];
  const registration = regDoc.data() as EventRegistration;

  // Check if fully refunded
  const isFullRefund = charge.amount_refunded >= charge.amount;

  await updateDoc(doc(db, COLLECTIONS.EVENT_REGISTRATIONS, regDoc.id), {
    paymentStatus: "refunded",
    status: isFullRefund ? "cancelled" : registration.status,
    updatedAt: Timestamp.now(),
  });

  // If fully refunded, update ticket quantities
  if (isFullRefund && registration.eventId) {
    const eventRef = doc(db, COLLECTIONS.EVENTS, registration.eventId);
    const eventSnap = await getDoc(eventRef);

    if (eventSnap.exists()) {
      const event = eventSnap.data() as EventDoc;
      const updatedTicketTypes = event.ticketTypes?.map((ticketType) => {
        const refundedTicket = registration.tickets.find(
          (t) => t.ticketTypeId === ticketType.id
        );
        if (refundedTicket) {
          return {
            ...ticketType,
            quantitySold: Math.max(
              0,
              ticketType.quantitySold - refundedTicket.quantity
            ),
          };
        }
        return ticketType;
      });

      const totalTicketsRefunded = registration.tickets.reduce(
        (sum, t) => sum + t.quantity,
        0
      );

      await updateDoc(eventRef, {
        ticketTypes: updatedTicketTypes,
        currentAttendees: increment(-totalTicketsRefunded),
        updatedAt: Timestamp.now(),
      });
    }
  }

  console.log(`Refund processed for registration ${regDoc.id}`);
}

// ============================================================================
// COURSE PURCHASE HANDLERS
// ============================================================================

async function handleCourseCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!db) return;

  const userId = session.metadata?.userId;
  const courseIds = session.metadata?.courseIds?.split(",") || [];
  const purchaseIds = session.metadata?.purchaseIds?.split(",") || [];

  if (!userId || courseIds.length === 0) {
    console.error("Missing metadata in course checkout session");
    return;
  }

  // Update all purchase records
  for (const purchaseId of purchaseIds) {
    const purchaseRef = doc(db, LMS_COLLECTIONS.COURSE_PURCHASES, purchaseId);
    const purchaseSnap = await getDoc(purchaseRef);

    if (!purchaseSnap.exists()) {
      console.error("Purchase not found:", purchaseId);
      continue;
    }

    const purchase = purchaseSnap.data() as CoursePurchaseDoc;

    // Update purchase status
    await updateDoc(purchaseRef, {
      paymentStatus: "paid",
      stripePaymentIntentId: session.payment_intent,
      purchasedAt: Timestamp.now(),
    });

    // Create enrollment for this course
    const enrollmentData = {
      id: "",
      userId: purchase.odUserId,
      courseId: purchase.courseId,
      enrolledAt: Timestamp.now(),
      completedAt: null,
      progressPercentage: 0,
      lastAccessedAt: null,
      certificateIssuedAt: null,
      certificateId: null,
      purchaseId: purchaseId,
    };

    await addDoc(collection(db, LMS_COLLECTIONS.ENROLLMENTS), enrollmentData);

    // Increment course enrollment count
    const courseRef = doc(db, LMS_COLLECTIONS.COURSES, purchase.courseId);
    await updateDoc(courseRef, {
      enrollmentCount: increment(1),
    });

    console.log(`Enrollment created for course ${purchase.courseId}, user ${purchase.odUserId}`);
  }

  console.log(`Course purchase completed for user ${userId}, courses: ${courseIds.join(", ")}`);
}
