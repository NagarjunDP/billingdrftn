import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth0 } from "./src/lib/auth0";
import { consumeRateLimit } from "./src/lib/server/rate-limit";

const ALLOWED_EMAILS = ["drftnclothing@gmail.com", "nagarjundp256@gmail.com"];

export async function proxy(req: NextRequest) {
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
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
