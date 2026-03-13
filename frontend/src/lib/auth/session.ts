"use server";

import { cookies } from "next/headers";

const ACCESS_TOKEN_KEY = "sl_access_token";
const REFRESH_TOKEN_KEY = "sl_refresh_token";
const USER_KEY = "sl_user";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setSession(accessToken: string, refreshToken: string, user: { id: string; email: string; name: string; avatar: string }) {
  const jar = await cookies();
  jar.set(ACCESS_TOKEN_KEY, accessToken, { ...COOKIE_OPTIONS, maxAge: 60 * 15 }); // 15 min
  jar.set(REFRESH_TOKEN_KEY, refreshToken, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 7 }); // 7 days
  jar.set(USER_KEY, JSON.stringify(user), { ...COOKIE_OPTIONS, httpOnly: false, maxAge: 60 * 60 * 24 * 7 });
}

export async function getSession() {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_TOKEN_KEY)?.value || null;
  const refreshToken = jar.get(REFRESH_TOKEN_KEY)?.value || null;
  const userRaw = jar.get(USER_KEY)?.value || null;
  const user = userRaw ? JSON.parse(userRaw) : null;
  return { accessToken, refreshToken, user };
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(ACCESS_TOKEN_KEY);
  jar.delete(REFRESH_TOKEN_KEY);
  jar.delete(USER_KEY);
}

export async function updateAccessToken(newToken: string) {
  const jar = await cookies();
  jar.set(ACCESS_TOKEN_KEY, newToken, { ...COOKIE_OPTIONS, maxAge: 60 * 15 });
}
