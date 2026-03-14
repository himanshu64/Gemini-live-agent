import { NextRequest, NextResponse } from "next/server";
import { loginWithGoogle } from "@/services/auth-api";
import { setSession } from "@/lib/auth/session";

function getExternalBaseUrl(request: NextRequest): string {
  // On Cloud Run (and other reverse proxies), request.url is the internal address.
  // Use x-forwarded-host/proto headers to reconstruct the real external URL.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  // Local dev: normalize 0.0.0.0 to localhost for Google OAuth compatibility
  return request.url.replace("//0.0.0.0", "//localhost");
}

export async function GET(request: NextRequest) {
  const baseUrl = getExternalBaseUrl(request);
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    const url = new URL("/login", baseUrl);
    url.searchParams.set("error", "Missing authorization code from Google");
    return NextResponse.redirect(url, 303);
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const url = new URL("/login", baseUrl);
    url.searchParams.set("error", "OAuth not configured on server");
    return NextResponse.redirect(url, 303);
  }

  const redirectUri = new URL("/api/auth/callback", baseUrl).toString();

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.id_token) {
      const url = new URL("/login", baseUrl);
      url.searchParams.set(
        "error",
        tokenData.error_description || "Failed to exchange code with Google"
      );
      return NextResponse.redirect(url, 303);
    }

    // Send id_token to backend (same as before)
    const result = await loginWithGoogle(tokenData.id_token);
    await setSession(result.access_token, result.refresh_token, result.user);
    return NextResponse.redirect(new URL("/live", baseUrl), 303);
  } catch (err) {
    const url = new URL("/login", baseUrl);
    url.searchParams.set(
      "error",
      err instanceof Error ? err.message : "Authentication failed"
    );
    return NextResponse.redirect(url, 303);
  }
}
