/**
 * Google Drive OAuth Callback
 * Handles the OAuth redirect and sends the code back to the parent window
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");
  const origin = request.nextUrl.origin;
  const safeError = error?.replace(/[<>&"']/g, "") || (code ? null : "missing_authorization_code");
  const hasError = Boolean(safeError);
  const payload = JSON.stringify({
    type: "google-oauth-callback",
    code,
    state,
    error: safeError,
  });

  // Return an HTML page that sends the code to the parent window
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Google Drive Authorization</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .success { color: #22c55e; }
          .error { color: #ef4444; }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${hasError ? `
            <h2 class="error">Authorization Failed</h2>
            <p>Error: ${safeError || "unknown_error"}</p>
            <p>This window will close automatically.</p>
          ` : `
            <div class="spinner"></div>
            <h2 class="success">Authorization Successful!</h2>
            <p>Connecting to Google Drive...</p>
            <p>This window will close automatically.</p>
          `}
        </div>
        <script>
          const payload = ${payload};
          if (window.opener) {
            window.opener.postMessage(payload, ${JSON.stringify(origin)});
          }
          setTimeout(() => window.close(), ${hasError ? 3000 : 2000});
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
