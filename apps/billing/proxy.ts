import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth0 } from "./src/lib/auth0";
import { consumeRateLimit } from "./src/lib/server/rate-limit";

const ALLOWED_EMAILS = ["drftnclothing@gmail.com", "nagarjundp256@gmail.com"];

export async function proxy(req: NextRequest) {
  try {
    // If it's an auth route, check rate limits
    if (req.nextUrl.pathname.startsWith("/auth")) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      if (!consumeRateLimit(`auth:${ip}`, 20, 60_000)) {
        return new NextResponse("Too many requests", { status: 429 });
      }
    }

    // Run the Auth0 middleware (handles OAuth callback, login, logout, etc.)
    const authResponse = await auth0.middleware(req);

    // Check whitelist for protected pages
    const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");
    if (!isAuthRoute) {
      const session = await auth0.getSession(req);
      if (!session || !session.user) {
        // Redirect to login if no session exists
        return NextResponse.redirect(new URL("/auth/login", req.url));
      }

      const email = session.user.email;
      if (!email || !ALLOWED_EMAILS.includes(email)) {
        return new NextResponse(
          `<html><body><h1>Access Denied</h1><p>Your email (${email ?? "unknown"}) is not authorized. <a href="/auth/logout">Logout</a></p></body></html>`,
          {
            status: 403,
            headers: { "Content-Type": "text/html" },
          }
        );
      }
    }

    return authResponse;
  } catch (error: any) {
    console.error("Auth0 Proxy Error:", error);
    return new NextResponse(
      `<html>
        <body style="font-family: system-ui, sans-serif; padding: 2rem; max-width: 600px; margin: auto; line-height: 1.5;">
          <h1 style="color: #dc2626; font-size: 1.8rem; border-bottom: 2px solid #fee2e2; padding-bottom: 0.5rem;">Authentication Configuration Diagnostic</h1>
          <p style="font-weight: bold; color: #b91c1c;">An error occurred while initializing or executing the Auth0 SDK:</p>
          <pre style="background: #f1f5f9; padding: 1rem; border-radius: 4px; border: 1px solid #cbd5e1; overflow-x: auto; font-family: monospace;">${error.message || error.toString()}</pre>
          <h3 style="margin-top: 1.5rem;">Next Steps to Fix:</h3>
          <ol style="padding-left: 1.25rem;">
            <li style="margin-bottom: 0.5rem;">Log in to your <strong>Netlify Dashboard</strong>.</li>
            <li style="margin-bottom: 0.5rem;">Navigate to <strong>Site configuration > Environment variables</strong>.</li>
            <li style="margin-bottom: 0.5rem;">Verify that these exact variables are added:
              <ul style="margin-top: 0.25rem; font-family: monospace; list-style-type: square;">
                <li><code>APP_BASE_URL</code> (e.g. <code>https://billingdrftn.netlify.app</code>)</li>
                <li><code>AUTH0_DOMAIN</code></li>
                <li><code>AUTH0_CLIENT_ID</code></li>
                <li><code>AUTH0_CLIENT_SECRET</code></li>
                <li><code>AUTH0_SECRET</code></li>
              </ul>
            </li>
            <li style="margin-bottom: 0.5rem;">Go to <strong>Deploys</strong> and click <strong>Trigger deploy > Clear cache and deploy site</strong> to rebuild the project with the variables.</li>
          </ol>
        </body>
      </html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
