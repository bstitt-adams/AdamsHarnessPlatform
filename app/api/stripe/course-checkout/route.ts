import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore";
import { LMS_COLLECTIONS, type CourseDoc, type CoursePurchaseDoc } from "@/lib/firebase-lms";
import Stripe from "stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      courseIds,
      customerInfo,
    }: {
      courseIds: string[];
      customerInfo: {
        userId: string;
        name: string;
        email: string;
      };
    } = body;

    // Validate required fields
    if (!courseIds || courseIds.length === 0 || !customerInfo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    // Fetch all courses and validate
    const courses: CourseDoc[] = [];
    let subtotal = 0;

    for (const courseId of courseIds) {
      const courseRef = doc(db, LMS_COLLECTIONS.COURSES, courseId);
      const courseSnap = await getDoc(courseRef);

      if (!courseSnap.exists()) {
        return NextResponse.json(
          { error: `Course ${courseId} not found` },
          { status: 404 }
        );
      }

      const course = { id: courseSnap.id, ...courseSnap.data() } as CourseDoc;

      if (!course.isPublished) {
        return NextResponse.json(
          { error: `Course "${course.title}" is not available for purchase` },
          { status: 400 }
        );
      }

      // Check if already purchased (would need to query purchases)
      // For now, we'll let the enrollment check handle this

      courses.push(course);
      subtotal += course.isFree ? 0 : course.priceInCents;
    }

    // If all courses are free, create enrollments directly
    if (subtotal === 0) {
      const enrollmentIds: string[] = [];
      
      for (const course of courses) {
        // Create purchase record
        const purchaseData: Omit<CoursePurchaseDoc, "id"> = {
          odUserId: customerInfo.userId,
          userEmail: customerInfo.email,
          userName: customerInfo.name,
          courseId: course.id,
          courseTitle: course.title,
          priceInCents: 0,
          discountInCents: 0,
          totalInCents: 0,
          couponCode: null,
          stripeSessionId: null,
          stripePaymentIntentId: null,
          paymentStatus: "paid",
          purchasedAt: Timestamp.now(),
          refundedAt: null,
          refundReason: null,
          createdAt: Timestamp.now(),
        };

        const purchaseRef = await addDoc(
          collection(db, LMS_COLLECTIONS.COURSE_PURCHASES),
          purchaseData
        );

        // Create enrollment
        const enrollmentData = {
          userId: customerInfo.userId,
          courseId: course.id,
          enrolledAt: Timestamp.now(),
          completedAt: null,
          progressPercentage: 0,
          lastAccessedAt: null,
          certificateIssuedAt: null,
          certificateId: null,
          purchaseId: purchaseRef.id,
        };

        const enrollmentRef = await addDoc(
          collection(db, LMS_COLLECTIONS.ENROLLMENTS),
          { id: "", ...enrollmentData }
        );

        enrollmentIds.push(enrollmentRef.id);
      }

      return NextResponse.json({
        success: true,
        isFree: true,
        enrollmentIds,
        redirectUrl: `/academy/my-courses?enrolled=true`,
      });
    }

    // Build Stripe line items
    const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = courses
      .filter((course) => !course.isFree && course.priceInCents > 0)
      .map((course) => ({
        price_data: {
          currency: STRIPE_CONFIG.currency,
          product_data: {
            name: course.title,
            description: course.shortDescription || undefined,
            images: course.thumbnailUrl ? [course.thumbnailUrl] : undefined,
            metadata: {
              courseId: course.id,
              type: "course",
            },
          },
          unit_amount: course.priceInCents,
        },
        quantity: 1,
      }));

    // Create pending purchase records
    const purchaseIds: string[] = [];
    for (const course of courses) {
      if (course.isFree) continue;

      const purchaseData: Omit<CoursePurchaseDoc, "id"> = {
        odUserId: customerInfo.userId,
        userEmail: customerInfo.email,
        userName: customerInfo.name,
        courseId: course.id,
        courseTitle: course.title,
        priceInCents: course.priceInCents,
        discountInCents: 0,
        totalInCents: course.priceInCents,
        couponCode: null,
        stripeSessionId: null,
        stripePaymentIntentId: null,
        paymentStatus: "pending",
        purchasedAt: Timestamp.now(),
        refundedAt: null,
        refundReason: null,
        createdAt: Timestamp.now(),
      };

      const purchaseRef = await addDoc(
        collection(db, LMS_COLLECTIONS.COURSE_PURCHASES),
        purchaseData
      );
      purchaseIds.push(purchaseRef.id);
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: STRIPE_CONFIG.paymentMethods as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      line_items: stripeLineItems,
      mode: "payment",
      success_url: `${APP_URL}/academy/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/academy/cart?cancelled=true`,
      customer_email: customerInfo.email,
      metadata: {
        type: "course_purchase",
        userId: customerInfo.userId,
        courseIds: courseIds.join(","),
        purchaseIds: purchaseIds.join(","),
      },
      billing_address_collection: "required",
      allow_promotion_codes: true,
    });

    // Update purchase records with Stripe session ID
    const { updateDoc } = await import("firebase/firestore");
    for (const purchaseId of purchaseIds) {
      await updateDoc(doc(db, LMS_COLLECTIONS.COURSE_PURCHASES, purchaseId), {
        stripeSessionId: session.id,
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      purchaseIds,
    });
  } catch (error) {
    console.error("Error creating course checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
