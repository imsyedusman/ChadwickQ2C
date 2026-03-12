import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Next.js 16 Proxy Convention
 * Replaces the deprecated middleware.ts file.
 */
export const proxy = withAuth(
  function proxy(req) {
    const isAuth = !!req.nextauth.token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login");
    const isPublicQuotePage = req.nextUrl.pathname.startsWith("/shared-quote");

    // Allow access to auth page and public quote page
    if (isAuthPage || isPublicQuotePage) {
      if (isAuth && isAuthPage) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // Redirect to login if not authenticated
    if (!isAuth) {
      const from = req.nextUrl.pathname + req.nextUrl.search;
      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      );
    }

    // Role-based access control for /admin
    if (req.nextUrl.pathname.startsWith("/admin")) {
      const userRole = req.nextauth.token?.role;
      if (userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (
          path.startsWith("/login") || 
          path.startsWith("/shared-quote") ||
          path.startsWith("/api/auth")
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth endpoints)
     * - _next/static (static files)
     * - _next/image (images)
     * - favicon.ico (favicon)
     * - login (auth page)
     * - shared-quote (publicly shared links)
     */
    "/((?!api/auth|_next|favicon.ico|login|shared-quote).*)",
  ],
};
