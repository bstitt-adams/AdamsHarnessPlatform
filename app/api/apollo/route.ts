import { NextRequest, NextResponse } from "next/server";

const APOLLO_API_BASE = "https://api.apollo.io/v1";

// Apollo API endpoints
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, apiKey, searchParams } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Apollo API key is required", connected: false },
        { status: 400 }
      );
    }

    // Apollo requires X-Api-Key header for authentication
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": apiKey,
    };

    switch (action) {
      case "test_connection": {
        // Test connection by making a simple search request
        try {
          const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              page: 1,
              per_page: 1,
            }),
          });

          const data = await response.json();
          
          if (response.ok || data.people !== undefined) {
            return NextResponse.json({ connected: true, message: "Connected to Apollo" });
          } else {
            return NextResponse.json(
              { connected: false, error: data.error || data.message || "Failed to connect to Apollo" },
              { status: response.status }
            );
          }
        } catch (err) {
          return NextResponse.json(
            { connected: false, error: "Network error connecting to Apollo" },
            { status: 500 }
          );
        }
      }

      case "search_people": {
        // Search for people/contacts
        const searchBody: Record<string, unknown> = {
          page: searchParams?.page || 1,
          per_page: searchParams?.per_page || 25,
        };

        // Only add non-empty arrays/strings
        if (searchParams?.titles?.length > 0) {
          searchBody.person_titles = searchParams.titles;
        }
        if (searchParams?.locations?.length > 0) {
          searchBody.person_locations = searchParams.locations;
        }
        if (searchParams?.industries?.length > 0) {
          searchBody.q_organization_keyword_tags = searchParams.industries;
        }
        if (searchParams?.keywords && searchParams.keywords.trim()) {
          searchBody.q_keywords = searchParams.keywords;
        }
        if (searchParams?.employee_ranges?.length > 0) {
          searchBody.organization_num_employees_ranges = searchParams.employee_ranges;
        }

        const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
          method: "POST",
          headers,
          body: JSON.stringify(searchBody),
        });

        const data = await response.json();

        if (response.ok && data.people) {
          return NextResponse.json({
            connected: true,
            results: data.people || [],
            pagination: data.pagination || {},
            total: data.pagination?.total_entries || 0,
          });
        } else {
          return NextResponse.json(
            { connected: false, error: data.error || data.message || "Search failed", results: [] },
            { status: response.status }
          );
        }
      }

      case "search_by_company_title": {
        // Search for people by company name and job title
        const searchBody: Record<string, unknown> = {
          page: searchParams?.page || 1,
          per_page: searchParams?.per_page || 25,
        };

        // Company name is the primary search criteria
        if (searchParams?.companyName && searchParams.companyName.trim()) {
          searchBody.q_organization_name = searchParams.companyName.trim();
        }

        // Job titles to filter by
        if (searchParams?.titles?.length > 0) {
          searchBody.person_titles = searchParams.titles;
        }

        // Optional additional filters
        if (searchParams?.locations?.length > 0) {
          searchBody.person_locations = searchParams.locations;
        }
        if (searchParams?.employee_ranges?.length > 0) {
          searchBody.organization_num_employees_ranges = searchParams.employee_ranges;
        }

        const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
          method: "POST",
          headers,
          body: JSON.stringify(searchBody),
        });

        const data = await response.json();

        if (response.ok && data.people) {
          return NextResponse.json({
            connected: true,
            results: data.people || [],
            pagination: data.pagination || {},
            total: data.pagination?.total_entries || 0,
          });
        } else {
          return NextResponse.json(
            { connected: false, error: data.error || data.message || "Search failed", results: [] },
            { status: response.status }
          );
        }
      }

      case "search_companies": {
        // Search for companies/organizations
        const companySearchBody: Record<string, unknown> = {
          page: searchParams?.page || 1,
          per_page: searchParams?.per_page || 25,
        };

        if (searchParams?.locations?.length > 0) {
          companySearchBody.organization_locations = searchParams.locations;
        }
        if (searchParams?.employee_ranges?.length > 0) {
          companySearchBody.organization_num_employees_ranges = searchParams.employee_ranges;
        }
        if (searchParams?.industries?.length > 0) {
          companySearchBody.q_organization_keyword_tags = searchParams.industries;
        }
        if (searchParams?.keywords && searchParams.keywords.trim()) {
          companySearchBody.q_keywords = searchParams.keywords;
        }

        const response = await fetch(`${APOLLO_API_BASE}/mixed_companies/search`, {
          method: "POST",
          headers,
          body: JSON.stringify(companySearchBody),
        });

        const data = await response.json();

        if (response.ok && data.organizations) {
          return NextResponse.json({
            connected: true,
            results: data.organizations || [],
            pagination: data.pagination || {},
            total: data.pagination?.total_entries || 0,
          });
        } else {
          return NextResponse.json(
            { connected: false, error: data.error || data.message || "Search failed", results: [] },
            { status: response.status }
          );
        }
      }

      case "enrich_person": {
        // Enrich a person's data
        const enrichBody: Record<string, unknown> = {};

        if (searchParams?.email) enrichBody.email = searchParams.email;
        if (searchParams?.first_name) enrichBody.first_name = searchParams.first_name;
        if (searchParams?.last_name) enrichBody.last_name = searchParams.last_name;
        if (searchParams?.company) enrichBody.organization_name = searchParams.company;
        if (searchParams?.linkedin_url) enrichBody.linkedin_url = searchParams.linkedin_url;

        const response = await fetch(`${APOLLO_API_BASE}/people/match`, {
          method: "POST",
          headers,
          body: JSON.stringify(enrichBody),
        });

        const data = await response.json();

        if (response.ok && data.person) {
          return NextResponse.json({
            connected: true,
            person: data.person || null,
          });
        } else {
          return NextResponse.json(
            { connected: false, error: data.error || data.message || "Enrichment failed" },
            { status: response.status }
          );
        }
      }

      case "reveal_email": {
        // Reveal email for a specific person using Apollo's people/bulk_match endpoint
        const personId = searchParams?.personId;
        const firstName = searchParams?.firstName;
        const lastName = searchParams?.lastName;
        const company = searchParams?.company;
        const linkedIn = searchParams?.linkedIn;
        
        if (!personId) {
          return NextResponse.json(
            { error: "Person ID is required", connected: false },
            { status: 400 }
          );
        }

        // Build the match request - Apollo needs identifying info, not just ID
        const matchDetails: Record<string, unknown> = {
          reveal_personal_emails: true,
        };
        
        // Add identifying information
        if (firstName) matchDetails.first_name = firstName;
        if (lastName) matchDetails.last_name = lastName;
        if (company) matchDetails.organization_name = company;
        if (linkedIn) matchDetails.linkedin_url = linkedIn;

        // Use Apollo's people/bulk_match endpoint which can use Apollo IDs
        const response = await fetch(`${APOLLO_API_BASE}/people/bulk_match`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            reveal_personal_emails: true,
            details: [{ id: personId, ...matchDetails }],
          }),
        });

        const data = await response.json();

        if (response.ok && data.matches?.[0]) {
          const person = data.matches[0];
          // Filter out Apollo's placeholder emails that indicate the email wasn't revealed
          const isPlaceholder = (email: string) => 
            !email || 
            email.includes("email_not_unlocked") || 
            email.includes("@domain.com") ||
            email === "email@domain.com";
          
          const email = person.email && !isPlaceholder(person.email) 
            ? person.email 
            : person.personal_emails?.find((e: string) => !isPlaceholder(e)) || null;
          
          return NextResponse.json({
            connected: true,
            email,
            person,
          });
        } else {
          // Fallback: try the single match endpoint with name/company
          if (firstName && lastName && company) {
            const fallbackResponse = await fetch(`${APOLLO_API_BASE}/people/match`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                organization_name: company,
                reveal_personal_emails: true,
              }),
            });
            
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackResponse.ok && fallbackData.person) {
              const isPlaceholder = (email: string) => 
                !email || 
                email.includes("email_not_unlocked") || 
                email.includes("@domain.com") ||
                email === "email@domain.com";
              
              const fallbackEmail = fallbackData.person.email && !isPlaceholder(fallbackData.person.email)
                ? fallbackData.person.email
                : fallbackData.person.personal_emails?.find((e: string) => !isPlaceholder(e)) || null;
              
              return NextResponse.json({
                connected: true,
                email: fallbackEmail,
                person: fallbackData.person,
              });
            }
          }
          
          return NextResponse.json(
            { connected: false, error: data.error || data.message || "Failed to reveal email" },
            { status: response.status || 400 }
          );
        }
      }

      case "reveal_phone": {
        // Reveal phone for a specific person
        const personId = searchParams?.personId;
        const firstName = searchParams?.firstName;
        const lastName = searchParams?.lastName;
        const company = searchParams?.company;
        const linkedIn = searchParams?.linkedIn;
        
        if (!personId) {
          return NextResponse.json(
            { error: "Person ID is required", connected: false },
            { status: 400 }
          );
        }

        // Build the match request
        const matchDetails: Record<string, unknown> = {
          reveal_phone_number: true,
        };
        
        if (firstName) matchDetails.first_name = firstName;
        if (lastName) matchDetails.last_name = lastName;
        if (company) matchDetails.organization_name = company;
        if (linkedIn) matchDetails.linkedin_url = linkedIn;

        const response = await fetch(`${APOLLO_API_BASE}/people/bulk_match`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            reveal_phone_number: true,
            details: [{ id: personId, ...matchDetails }],
          }),
        });

        const data = await response.json();

        if (response.ok && data.matches?.[0]) {
          const person = data.matches[0];
          const phone = person.phone_numbers?.[0]?.sanitized_number || 
                       person.mobile_phone || 
                       person.corporate_phone || null;
          return NextResponse.json({
            connected: true,
            phone,
            person,
          });
        } else {
          // Fallback: try the single match endpoint with name/company
          if (firstName && lastName && company) {
            const fallbackResponse = await fetch(`${APOLLO_API_BASE}/people/match`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                organization_name: company,
                reveal_phone_number: true,
              }),
            });
            
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackResponse.ok && fallbackData.person) {
              const phone = fallbackData.person.phone_numbers?.[0]?.sanitized_number || 
                           fallbackData.person.mobile_phone || 
                           fallbackData.person.corporate_phone || null;
              return NextResponse.json({
                connected: true,
                phone,
                person: fallbackData.person,
              });
            }
          }
          
          return NextResponse.json(
            { connected: false, error: data.error || data.message || "Failed to reveal phone" },
            { status: response.status || 400 }
          );
        }
      }

      case "bulk_reveal": {
        // Bulk reveal emails and phones for multiple people
        const personIds = searchParams?.personIds;
        
        if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
          return NextResponse.json(
            { error: "Person IDs array is required", connected: false },
            { status: 400 }
          );
        }

        // Process in batches to avoid rate limiting
        const results: { id: string; email?: string; phone?: string }[] = [];
        
        for (const personId of personIds) {
          try {
            const response = await fetch(`${APOLLO_API_BASE}/people/match`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                id: personId,
                reveal_personal_emails: true,
                reveal_phone_number: true,
              }),
            });

            const data = await response.json();
            
            if (response.ok && data.person) {
              results.push({
                id: personId,
                email: data.person.email || data.person.personal_emails?.[0] || undefined,
                phone: data.person.phone_numbers?.[0]?.sanitized_number || 
                       data.person.mobile_phone || 
                       data.person.corporate_phone || undefined,
              });
            }
          } catch (err) {
            console.error(`Error revealing contact ${personId}:`, err);
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        return NextResponse.json({
          connected: true,
          results,
          total: results.length,
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action", connected: false },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Apollo API error:", error);
    return NextResponse.json(
      { error: "Internal server error", connected: false },
      { status: 500 }
    );
  }
}

// GET endpoint to check connection status
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-apollo-api-key");

  if (!apiKey) {
    return NextResponse.json({ connected: false, error: "No API key provided" });
  }

  try {
    const response = await fetch(`${APOLLO_API_BASE}/auth/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
    });

    if (response.ok) {
      return NextResponse.json({ connected: true });
    } else {
      return NextResponse.json({ connected: false, error: "Invalid API key or connection failed" });
    }
  } catch (error) {
    return NextResponse.json({ connected: false, error: "Failed to connect to Apollo" });
  }
}
