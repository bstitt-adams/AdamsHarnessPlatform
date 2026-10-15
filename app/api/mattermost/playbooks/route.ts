import { NextRequest, NextResponse } from "next/server";

/**
 * MatterMost Playbooks API Route
 * 
 * Handles all Playbook-related operations including:
 * - Creating playbooks
 * - Listing playbooks
 * - Starting playbook runs
 * - Getting users and teams
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, serverUrl, token, config, teamId } = body;

    if (!serverUrl || !token) {
      return NextResponse.json(
        { success: false, error: "Missing serverUrl or token" },
        { status: 400 }
      );
    }

    // Normalize server URL (remove trailing slash)
    const baseUrl = serverUrl.replace(/\/$/, "");
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    switch (action) {
      case "create_playbook": {
        if (!config) {
          return NextResponse.json(
            { success: false, error: "Missing playbook config" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${baseUrl}/plugins/playbooks/api/v0/playbooks`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(config),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { success: false, error: `Failed to create playbook: ${errorText}` },
            { status: response.status }
          );
        }

        const playbook = await response.json();
        return NextResponse.json({ success: true, playbook });
      }

      case "list_playbooks": {
        if (!teamId) {
          return NextResponse.json(
            { success: false, error: "Missing teamId" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${baseUrl}/plugins/playbooks/api/v0/playbooks?team_id=${teamId}`,
          {
            method: "GET",
            headers,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { success: false, error: `Failed to list playbooks: ${errorText}` },
            { status: response.status }
          );
        }

        const data = await response.json();
        return NextResponse.json({ success: true, playbooks: data.items || [] });
      }

      case "start_run": {
        if (!config) {
          return NextResponse.json(
            { success: false, error: "Missing run config" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${baseUrl}/plugins/playbooks/api/v0/runs`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(config),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { success: false, error: `Failed to start playbook run: ${errorText}` },
            { status: response.status }
          );
        }

        const run = await response.json();
        return NextResponse.json({ success: true, run });
      }

      case "get_users": {
        if (!teamId) {
          return NextResponse.json(
            { success: false, error: "Missing teamId" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${baseUrl}/api/v4/users?in_team=${teamId}&per_page=200`,
          {
            method: "GET",
            headers,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { success: false, error: `Failed to get users: ${errorText}` },
            { status: response.status }
          );
        }

        const users = await response.json();
        return NextResponse.json({ success: true, users });
      }

      case "get_teams": {
        const response = await fetch(
          `${baseUrl}/api/v4/users/me/teams`,
          {
            method: "GET",
            headers,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { success: false, error: `Failed to get teams: ${errorText}` },
            { status: response.status }
          );
        }

        const teams = await response.json();
        return NextResponse.json({ success: true, teams });
      }

      case "get_playbook": {
        const { playbookId } = body;
        if (!playbookId) {
          return NextResponse.json(
            { success: false, error: "Missing playbookId" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${baseUrl}/plugins/playbooks/api/v0/playbooks/${playbookId}`,
          {
            method: "GET",
            headers,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { success: false, error: `Failed to get playbook: ${errorText}` },
            { status: response.status }
          );
        }

        const playbook = await response.json();
        return NextResponse.json({ success: true, playbook });
      }

      case "list_runs": {
        if (!teamId) {
          return NextResponse.json(
            { success: false, error: "Missing teamId" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${baseUrl}/plugins/playbooks/api/v0/runs?team_id=${teamId}`,
          {
            method: "GET",
            headers,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { success: false, error: `Failed to list runs: ${errorText}` },
            { status: response.status }
          );
        }

        const data = await response.json();
        return NextResponse.json({ success: true, runs: data.items || [] });
      }

      case "update_playbook": {
        const { playbookId } = body;
        if (!playbookId || !config) {
          return NextResponse.json(
            { success: false, error: "Missing playbookId or config" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${baseUrl}/plugins/playbooks/api/v0/playbooks/${playbookId}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify(config),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { success: false, error: `Failed to update playbook: ${errorText}` },
            { status: response.status }
          );
        }

        const playbook = await response.json();
        return NextResponse.json({ success: true, playbook });
      }

      case "get_run": {
        const { runId } = body;
        if (!runId) {
          return NextResponse.json(
            { success: false, error: "Missing runId" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${baseUrl}/plugins/playbooks/api/v0/runs/${runId}`,
          {
            method: "GET",
            headers,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { success: false, error: `Failed to get run: ${errorText}` },
            { status: response.status }
          );
        }

        const run = await response.json();
        return NextResponse.json({ success: true, run });
      }

      case "update_run_status": {
        const { runId, status } = body;
        if (!runId || !status) {
          return NextResponse.json(
            { success: false, error: "Missing runId or status" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${baseUrl}/plugins/playbooks/api/v0/runs/${runId}/status`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ status }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { success: false, error: `Failed to update run status: ${errorText}` },
            { status: response.status }
          );
        }

        return NextResponse.json({ success: true });
      }

      case "update_checklist_item": {
        const { runId, checklistIndex, itemIndex, updates } = body;
        if (runId === undefined || checklistIndex === undefined || itemIndex === undefined) {
          return NextResponse.json(
            { success: false, error: "Missing runId, checklistIndex, or itemIndex" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${baseUrl}/plugins/playbooks/api/v0/runs/${runId}/checklists/${checklistIndex}/item/${itemIndex}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify(updates),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { success: false, error: `Failed to update checklist item: ${errorText}` },
            { status: response.status }
          );
        }

        return NextResponse.json({ success: true });
      }

      case "check_checklist_item": {
        const { runId, checklistIndex, itemIndex } = body;
        if (runId === undefined || checklistIndex === undefined || itemIndex === undefined) {
          return NextResponse.json(
            { success: false, error: "Missing runId, checklistIndex, or itemIndex" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${baseUrl}/plugins/playbooks/api/v0/runs/${runId}/checklists/${checklistIndex}/item/${itemIndex}/state`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({ new_state: "closed" }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { success: false, error: `Failed to check item: ${errorText}` },
            { status: response.status }
          );
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("MatterMost Playbooks API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
