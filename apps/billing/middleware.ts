import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/server/rate-limit";

const isPublicRoute = createRouteMatcher(["/login(.*)"]);
const isAuthSurface = createRouteMatcher(["/login(.*)", "/api/auth(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isAuthSurface(req)) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!consumeRateLimit(`auth:${ip}`, 20, 60_000)) {
      return new NextResponse("Too many requests", { status: 429 });
    }
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
