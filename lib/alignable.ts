/**
 * Alignable Integration Service
 * 
 * Helper functions for interacting with the Alignable API
 * and managing business networking features.
 */

// Types for Alignable data structures
export interface AlignableBusiness {
  id: string;
  business_name: string;
  description?: string;
  location?: string;
  industry?: string;
  website?: string;
  logo_url?: string;
  cover_image_url?: string;
  connection_count: number;
  recommendation_count: number;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlignableConnection {
  id: string;
  business: AlignableBusiness;
  connected_at: string;
  status: "connected" | "pending" | "blocked";
  notes?: string;
}

export interface AlignablePost {
  id: string;
  content: string;
  author: AlignableBusiness;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  visibility: "public" | "connections" | "private";
  created_at: string;
  updated_at: string;
}

export interface AlignableRecommendation {
  id: string;
  author: AlignableBusiness;
  recipient: AlignableBusiness;
  content: string;
  rating: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  is_featured: boolean;
  created_at: string;
}

export interface AlignableMessage {
  id: string;
  sender: AlignableBusiness;
  recipient: AlignableBusiness;
  content: string;
  attachment_urls: string[];
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface AlignableNotification {
  id: string;
  type: "connection_request" | "recommendation" | "post_mention" | "message" | "post_like" | "comment";
  actor: AlignableBusiness;
  target_id?: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface AlignableAnalytics {
  profile_views: number;
  connection_requests_sent: number;
  connection_requests_received: number;
  posts_count: number;
  posts_engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  recommendations_given: number;
  recommendations_received: number;
  messages_sent: number;
  messages_received: number;
  period_start: string;
  period_end: string;
}

// Client-side API helper
export async function alignableApiRequest(
  action: string,
  apiKey?: string,
  accessToken?: string,
  searchParams?: Record<string, any>,
  data?: Record<string, any>
) {
  const response = await fetch("/api/alignable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      apiKey,
      accessToken,
      searchParams,
      data,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Alignable API request failed");
  }

  return response.json();
}

// Helper to format Alignable content for display
export function formatAlignableContent(content: string, maxLength?: number): string {
  if (!maxLength || content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + "...";
}

// Helper to format relative time
export function formatAlignableTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Generate shareable link for a business profile
export function generateAlignableProfileLink(businessId: string): string {
  return `https://alignable.com/biz/${businessId}`;
}

// Extract hashtags from post content
export function extractHashtags(content: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const matches = content.match(hashtagRegex);
  return matches ? matches.map(tag => tag.substring(1)) : [];
}

// Validate Alignable post content
export function validatePostContent(content: string): { valid: boolean; error?: string } {
  if (!content.trim()) {
    return { valid: false, error: "Post content cannot be empty" };
  }
  if (content.length > 2000) {
    return { valid: false, error: "Post content exceeds 2000 character limit" };
  }
  return { valid: true };
}

// Validate recommendation content
export function validateRecommendation(content: string, rating: number): { valid: boolean; error?: string } {
  if (!content.trim()) {
    return { valid: false, error: "Recommendation content cannot be empty" };
  }
  if (content.length < 50) {
    return { valid: false, error: "Recommendation should be at least 50 characters" };
  }
  if (content.length > 1000) {
    return { valid: false, error: "Recommendation exceeds 1000 character limit" };
  }
  if (rating < 1 || rating > 5) {
    return { valid: false, error: "Rating must be between 1 and 5" };
  }
  return { valid: true };
}

// Calculate engagement rate
export function calculateEngagementRate(
  likes: number,
  comments: number,
  shares: number,
  impressions: number
): number {
  if (impressions === 0) return 0;
  const totalEngagement = likes + comments + shares;
  return Math.round((totalEngagement / impressions) * 100 * 100) / 100;
}

// Sort connections by various criteria
export function sortConnections(
  connections: AlignableConnection[],
  sortBy: "recent" | "name" | "industry" = "recent"
): AlignableConnection[] {
  const sorted = [...connections];
  
  switch (sortBy) {
    case "recent":
      return sorted.sort((a, b) => 
        new Date(b.connected_at).getTime() - new Date(a.connected_at).getTime()
      );
    case "name":
      return sorted.sort((a, b) => 
        a.business.business_name.localeCompare(b.business.business_name)
      );
    case "industry":
      return sorted.sort((a, b) => 
        (a.business.industry || "").localeCompare(b.business.industry || "")
      );
    default:
      return sorted;
  }
}

// Filter connections by search query
export function filterConnections(
  connections: AlignableConnection[],
  query: string
): AlignableConnection[] {
  if (!query.trim()) return connections;
  
  const lowercaseQuery = query.toLowerCase();
  return connections.filter(conn => 
    conn.business.business_name.toLowerCase().includes(lowercaseQuery) ||
    (conn.business.industry || "").toLowerCase().includes(lowercaseQuery) ||
    (conn.business.location || "").toLowerCase().includes(lowercaseQuery)
  );
}

// Generate suggested search queries for business discovery
export const SUGGESTED_SEARCH_QUERIES = [
  "electrical contractor",
  "general contractor",
  "construction management",
  "commercial real estate",
  "design-build",
  "prefabrication",
  "BIM coordination",
  "Southeast construction",
  "building owners",
  "business networking",
];

// Post templates for common business scenarios
export const POST_TEMPLATES = {
  milestone: "🎉 Exciting milestone! We just helped our {number}th business owner achieve {achievement}. Here's what we learned...",
  tip: "💡 Business Tip: {tip}. This simple change helped one of our clients {result} in just {timeframe}.",
  question: "🤔 Business owners: {question}? I'd love to hear your thoughts and experiences in the comments!",
  success: "⭐ Client Success Story: {client} just {achievement}! Proud to be part of their journey to {goal}.",
  insight: "📊 Insight from our latest client work: {insight}. What trends are you seeing in your industry?",
  event: "📅 Join us for {event}! We're bringing together local business owners to discuss {topic}. Link in comments.",
  recommendation: "🙏 Grateful for the amazing recommendation from {business}! {snippet}",
};

// Industry categories for filtering
export const INDUSTRY_CATEGORIES = [
  "Business Services",
  "Engineering",
  "Training & Workforce Development",
  "Financial Services",
  "Legal Services",
  "Marketing & Advertising",
  "Real Estate",
  "Technology",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Construction",
  "Food & Beverage",
  "Professional Services",
  "Other",
];

// Connection request message templates
export const CONNECTION_TEMPLATES = {
  default: "Hi {name}, I'd love to connect with fellow business owners in the {location} area. Let's grow together!",
  mutual: "Hi {name}, I noticed we both work with {industry} businesses. Would love to connect and share insights!",
  local: "Hi {name}, I'm always looking to connect with local business owners here in {location}. Let's network!",
  referral: "Hi {name}, {mutual_connection} suggested we connect. I'd love to learn more about your business!",
};
