/**
 * Mercury Bank API Route
 * 
 * Provides endpoints for Mercury Bank integration:
 * - GET: Fetch accounts, transactions, recipients
 * - POST: Various actions based on 'action' parameter
 * 
 * API Token is fetched from Firestore settings or environment variable
 */

import { NextRequest, NextResponse } from "next/server";
import { MercuryService } from "@/lib/mercury-service";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";

async function getMercuryApiToken(): Promise<string | null> {
  // First try environment variable
  const envToken = process.env.MERCURY_API_TOKEN;
  if (envToken) {
    return envToken;
  }

  // Then try Firestore settings
  try {
    if (!db) {
      console.warn("Firebase not initialized");
      return null;
    }
    
    const settingsRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, "global");
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      const data = settingsSnap.data();
      const mercuryKey = data?.apiKeys?.mercury?.apiKey;
      if (mercuryKey) {
        return mercuryKey;
      }
    }
  } catch (error) {
    console.error("Error fetching Mercury settings from Firestore:", error);
  }

  return null;
}

async function getMercuryService(): Promise<MercuryService | null> {
  const apiToken = await getMercuryApiToken();
  
  if (!apiToken) {
    return null;
  }

  return new MercuryService({ apiToken });
}

export async function GET(request: NextRequest) {
  try {
    const mercuryService = await getMercuryService();
    
    if (!mercuryService) {
      return NextResponse.json({
        success: false,
        error: "Mercury API not configured. Go to Settings > Integrations to add your Mercury API Token.",
      }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action") || "accounts";
    const accountId = searchParams.get("accountId");

    switch (action) {
      case "accounts": {
        const result = await mercuryService.getAccounts();
        return NextResponse.json(result);
      }

      case "account": {
        if (!accountId) {
          return NextResponse.json({
            success: false,
            error: "accountId is required",
          }, { status: 400 });
        }
        const result = await mercuryService.getAccount(accountId);
        return NextResponse.json(result);
      }

      case "transactions": {
        if (!accountId) {
          return NextResponse.json({
            success: false,
            error: "accountId is required",
          }, { status: 400 });
        }
        
        const offset = searchParams.get("offset");
        const limit = searchParams.get("limit");
        const status = searchParams.get("status");
        const start = searchParams.get("start");
        const end = searchParams.get("end");

        const result = await mercuryService.getTransactions(accountId, {
          offset: offset ? parseInt(offset) : undefined,
          limit: limit ? parseInt(limit) : undefined,
          status: status || undefined,
          start: start || undefined,
          end: end || undefined,
        });
        return NextResponse.json(result);
      }

      case "recipients": {
        const result = await mercuryService.getRecipients();
        return NextResponse.json(result);
      }

      case "statements": {
        if (!accountId) {
          return NextResponse.json({
            success: false,
            error: "accountId is required",
          }, { status: 400 });
        }
        const result = await mercuryService.getStatements(accountId);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
        }, { status: 400 });
    }
  } catch (error) {
    console.error("Mercury API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const mercuryService = await getMercuryService();
    
    if (!mercuryService) {
      return NextResponse.json({
        success: false,
        error: "Mercury API not configured. Go to Settings > Integrations to add your Mercury API Token.",
      }, { status: 500 });
    }

    const body = await request.json();
    const { action, accountId, transactionId, recipientId } = body;

    switch (action) {
      case "get_transaction": {
        if (!accountId || !transactionId) {
          return NextResponse.json({
            success: false,
            error: "accountId and transactionId are required",
          }, { status: 400 });
        }
        const result = await mercuryService.getTransaction(accountId, transactionId);
        return NextResponse.json(result);
      }

      case "get_recipient": {
        if (!recipientId) {
          return NextResponse.json({
            success: false,
            error: "recipientId is required",
          }, { status: 400 });
        }
        const result = await mercuryService.getRecipient(recipientId);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
        }, { status: 400 });
    }
  } catch (error) {
    console.error("Mercury API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
