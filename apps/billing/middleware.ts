import { getSession } from "@auth0/nextjs-auth0/edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { consumeRateLimit } from "@/lib/server/rate-limit";

const ALLOWED_EMAILS = ["drftnclothing@gmail.com", "nagarjundp256@gmail.com"];

export default async function middleware(req: NextRequest) {
  // If it's an auth route, check rate limits
  if (req.nextUrl.pathname.startsWith("/api/auth")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!consumeRateLimit(`auth:${ip}`, 20, 60_000)) {
      return new NextResponse("Too many requests", { status: 429 });
    }
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const session = await getSession(req, res);

  // If not logged in, redirect to login
  if (!session?.user) {
    const loginUrl = new URL("/api/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Whitelist email check
  const email = session.user.email;
  if (!email || !ALLOWED_EMAILS.includes(email)) {
    return new NextResponse(
      `<html><body><h1>Access Denied</h1><p>Your email (${email ?? "unknown"}) is not authorized. <a href="/api/auth/logout">Logout</a></p></body></html>`,
      {
        status: 403,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
