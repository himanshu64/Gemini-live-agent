import { NextRequest, NextResponse } from "next/server";
import { loginWithGoogle } from "@/services/auth-api";
import { setSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const credential = formData.get("credential") as string | null;

  if (!credential) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "Missing credential from Google");
    return NextResponse.redirect(url, 303);
  }

  try {
    const result = await loginWithGoogle(credential);
    await setSession(result.access_token, result.refresh_token, result.user);
    return NextResponse.redirect(new URL("/live", request.url), 303);
  } catch (err) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", err instanceof Error ? err.message : "Authentication failed");
    return NextResponse.redirect(url, 303);
  }
}
