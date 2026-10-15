import { NextRequest, NextResponse } from "next/server";

const ALIGNABLE_API_BASE = "https://api.alignable.com/v1";

/**
 * Alignable API Integration
 * 
 * Alignable is a business networking platform for small businesses.
 * This API supports:
 * - Connection management
 * - Business profile access
 * - Content exchange (posts, recommendations)
 * - Message reading/sending
 * - Network analytics
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, apiKey, accessToken, searchParams, data } = body;

    if (!apiKey && !accessToken) {
      return NextResponse.json(
        { error: "Alignable API key or access token is required", connected: false },
        { status: 400 }
      );
    }

    // Alignable uses Bearer token authentication
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Cache-Control": "no-cache",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else {
      headers["X-Api-Key"] = apiKey;
    }

    switch (action) {
      case "test_connection": {
        // Test connection by fetching user profile
        try {
          const response = await fetch(`${ALIGNABLE_API_BASE}/me`, {
            method: "GET",
            headers,
          });

          const data = await response.json();
          
          if (response.ok && data.id) {
            return NextResponse.json({ 
              connected: true, 
              message: "Connected to Alignable",
              business: data.business_name || data.name
            });
          } else {
            return NextResponse.json(
              { connected: false, error: data.error || data.message || "Failed to connect to Alignable" },
              { status: response.status }
            );
          }
        } catch (err) {
          return NextResponse.json(
            { connected: false, error: "Network error connecting to Alignable" },
            { status: 500 }
          );
        }
      }

      case "get_profile": {
        // Get current user's business profile
        const response = await fetch(`${ALIGNABLE_API_BASE}/me`, {
          method: "GET",
          headers,
        });

        const profileData = await response.json();
        return NextResponse.json(profileData);
      }

      case "get_connections": {
        // Get business connections/network
        const response = await fetch(
          `${ALIGNABLE_API_BASE}/connections?page=${searchParams?.page || 1}&per_page=${searchParams?.per_page || 25}`,
          {
            method: "GET",
            headers,
          }
        );

        const connectionsData = await response.json();
        return NextResponse.json(connectionsData);
      }

      case "search_businesses": {
        // Search for businesses on Alignable
        const queryParams = new URLSearchParams({
          q: searchParams?.query || "",
          page: String(searchParams?.page || 1),
          per_page: String(searchParams?.per_page || 25),
          ...(searchParams?.location && { location: searchParams.location }),
          ...(searchParams?.industry && { industry: searchParams.industry }),
        });

        const response = await fetch(
          `${ALIGNABLE_API_BASE}/businesses/search?${queryParams}`,
          {
            method: "GET",
            headers,
          }
        );

        const searchData = await response.json();
        return NextResponse.json(searchData);
      }

      case "get_posts": {
        // Get posts from feed or specific business
        const endpoint = searchParams?.businessId 
          ? `/businesses/${searchParams.businessId}/posts`
          : `/feed`;
        
        const queryParams = new URLSearchParams({
          page: String(searchParams?.page || 1),
          per_page: String(searchParams?.per_page || 25),
        });

        const response = await fetch(
          `${ALIGNABLE_API_BASE}${endpoint}?${queryParams}`,
          {
            method: "GET",
            headers,
          }
        );

        const postsData = await response.json();
        return NextResponse.json(postsData);
      }

      case "create_post": {
        // Create a new post on Alignable
        const response = await fetch(`${ALIGNABLE_API_BASE}/posts`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            content: data?.content,
            media_urls: data?.mediaUrls || [],
            visibility: data?.visibility || "public",
            ...(data?.category && { category: data.category }),
          }),
        });

        const postData = await response.json();
        return NextResponse.json(postData);
      }

      case "get_recommendations": {
        // Get recommendations/reviews
        const endpoint = searchParams?.businessId
          ? `/businesses/${searchParams.businessId}/recommendations`
          : `/me/recommendations`;

        const queryParams = new URLSearchParams({
          page: String(searchParams?.page || 1),
          per_page: String(searchParams?.per_page || 25),
        });

        const response = await fetch(
          `${ALIGNABLE_API_BASE}${endpoint}?${queryParams}`,
          {
            method: "GET",
            headers,
          }
        );

        const recommendationsData = await response.json();
        return NextResponse.json(recommendationsData);
      }

      case "create_recommendation": {
        // Create a recommendation for another business
        const response = await fetch(`${ALIGNABLE_API_BASE}/recommendations`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            business_id: data?.businessId,
            content: data?.content,
            rating: data?.rating,
            ...(data?.tags && { tags: data.tags }),
          }),
        });

        const recommendationData = await response.json();
        return NextResponse.json(recommendationData);
      }

      case "get_messages": {
        // Get private messages/conversations
        const queryParams = new URLSearchParams({
          page: String(searchParams?.page || 1),
          per_page: String(searchParams?.per_page || 25),
          ...(searchParams?.unreadOnly && { unread_only: "true" }),
        });

        const response = await fetch(
          `${ALIGNABLE_API_BASE}/messages?${queryParams}`,
          {
            method: "GET",
            headers,
          }
        );

        const messagesData = await response.json();
        return NextResponse.json(messagesData);
      }

      case "send_message": {
        // Send a private message
        const response = await fetch(`${ALIGNABLE_API_BASE}/messages`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            recipient_id: data?.recipientId,
            content: data?.content,
            ...(data?.attachmentUrls && { attachment_urls: data.attachmentUrls }),
          }),
        });

        const messageData = await response.json();
        return NextResponse.json(messageData);
      }

      case "get_analytics": {
        // Get network analytics and insights
        const response = await fetch(`${ALIGNABLE_API_BASE}/analytics/overview`, {
          method: "GET",
          headers,
        });

        const analyticsData = await response.json();
        return NextResponse.json(analyticsData);
      }

      case "request_connection": {
        // Send connection request to another business
        const response = await fetch(`${ALIGNABLE_API_BASE}/connections/requests`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            business_id: data?.businessId,
            message: data?.message,
          }),
        });

        const connectionData = await response.json();
        return NextResponse.json(connectionData);
      }

      case "get_notifications": {
        // Get notifications/alerts
        const queryParams = new URLSearchParams({
          page: String(searchParams?.page || 1),
          per_page: String(searchParams?.per_page || 25),
          ...(searchParams?.unreadOnly && { unread_only: "true" }),
        });

        const response = await fetch(
          `${ALIGNABLE_API_BASE}/notifications?${queryParams}`,
          {
            method: "GET",
            headers,
          }
        );

        const notificationsData = await response.json();
        return NextResponse.json(notificationsData);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Alignable API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint for simple status check
export async function GET() {
  return NextResponse.json({
    status: "Alignable API integration ready",
    endpoints: [
      "test_connection",
      "get_profile",
      "get_connections",
      "search_businesses",
      "get_posts",
      "create_post",
      "get_recommendations",
      "create_recommendation",
      "get_messages",
      "send_message",
      "get_analytics",
      "request_connection",
      "get_notifications",
    ],
    documentation: "https://developers.alignable.com",
  });
}
