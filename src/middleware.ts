import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isProtectedPage = pathname.startsWith("/dashboard") || pathname.startsWith("/projects");

  if (isProtectedPage && !token) {
    // Redirect to login if trying to access dashboard/projects without token
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && token) {
    // Redirect to dashboard if logged-in user visits login/signup
    const url = new URL("/dashboard", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/login",
    "/signup",
  ],
};
