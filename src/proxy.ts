import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const ADMIN_AUTH_COOKIE = "admin_auth";

function isAuthed(request: NextRequest): boolean {
  return request.cookies.get(ADMIN_AUTH_COOKIE)?.value === process.env.ADMIN_PASSWORD;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") return NextResponse.next();
    if (!isAuthed(request)) return redirectToLogin(request);
    return NextResponse.next();
  }

  if (pathname.startsWith("/read/")) {
    // Already-authed admin previewing a draft: skip the lookup entirely.
    if (isAuthed(request)) return NextResponse.next();

    const slug = pathname.slice("/read/".length);
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!slug || slug.includes("/") || !convexUrl) return NextResponse.next();

    try {
      const client = new ConvexHttpClient(convexUrl);
      const text = await client.query(api.texts.getBySlug, { slug });
      if (text && text.status !== "published") {
        return redirectToLogin(request);
      }
    } catch {
      // Convex unreachable -- fail open rather than blocking readers over a
      // transient error; the reader page itself still gates on approved
      // sections either way.
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/read/:path*"],
};
