import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secretKey } = body;

    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: "Secret key is required" },
        { status: 400 }
      );
    }

    // Create a temporary Stripe instance with the provided key
    const stripe = new Stripe(secretKey, {
      typescript: true,
    });

    // Test the connection by fetching account info
    const account = await stripe.accounts.retrieve();

    return NextResponse.json({
      success: true,
      accountId: account.id,
      accountName: account.business_profile?.name || account.email || "Connected",
    });
  } catch (error) {
    console.error("Stripe connection test failed:", error);
    
    let errorMessage = "Connection failed";
    if (error instanceof Stripe.errors.StripeAuthenticationError) {
      errorMessage = "Invalid API key";
    } else if (error instanceof Stripe.errors.StripePermissionError) {
      errorMessage = "Insufficient permissions";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    );
  }
}
