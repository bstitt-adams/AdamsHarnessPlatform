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
          ${error ? `
            <h2 class="error">Authorization Failed</h2>
            <p>Error: ${error}</p>
            <p>This window will close automatically.</p>
          ` : `
            <div class="spinner"></div>
            <h2 class="success">Authorization Successful!</h2>
            <p>Connecting to Google Drive...</p>
            <p>This window will close automatically.</p>
          `}
        </div>
        <script>
          ${error ? `
            // Send error to parent
            if (window.opener) {
              window.opener.postMessage({
                type: 'google-oauth-callback',
                error: '${error}'
              }, '*');
            }
            setTimeout(() => window.close(), 3000);
          ` : `
            // Send code to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'google-oauth-callback',
                code: '${code}',
                state: '${state || ''}'
              }, '*');
            }
            setTimeout(() => window.close(), 2000);
          `}
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
