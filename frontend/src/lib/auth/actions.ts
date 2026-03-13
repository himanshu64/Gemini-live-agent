"use server";

import { redirect } from "next/navigation";
import { loginWithGoogle, logoutBackend, refreshAccessToken } from "@/services/auth-api";
import { setSession, getSession, clearSession, updateAccessToken } from "./session";

export async function googleLoginAction(idToken: string) {
  const result = await loginWithGoogle(idToken);
  await setSession(result.access_token, result.refresh_token, result.user);
  return result.user;
}

export async function logoutAction() {
  const { accessToken } = await getSession();
  if (accessToken) await logoutBackend(accessToken);
  await clearSession();
  redirect("/login");
}

export async function refreshAction(): Promise<string | null> {
  const { refreshToken } = await getSession();
  if (!refreshToken) return null;
  try {
    const { access_token } = await refreshAccessToken(refreshToken);
    await updateAccessToken(access_token);
    return access_token;
  } catch {
    await clearSession();
    return null;
  }
}

export async function getAccessTokenAction(): Promise<string | null> {
  const { accessToken } = await getSession();
  return accessToken;
}
