import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/profile", "/settings", "/rewards", "/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route requires auth
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (!isProtected) return NextResponse.next();

  // Check for access token or refresh token in cookies
  const accessToken = request.cookies.get("sl_access_token")?.value;
  const refreshToken = request.cookies.get("sl_refresh_token")?.value;

  if (!accessToken && !refreshToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/settings/:path*", "/rewards/:path*", "/admin/:path*"],
};
