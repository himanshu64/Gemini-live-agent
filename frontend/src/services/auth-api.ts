import { API_URL } from "@/lib/constants";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const url = `${API_URL}/auth/google`;
  console.log("[auth] POST", url);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
  } catch (err) {
    console.error("[auth] Network error reaching backend:", err);
    throw new Error(`Cannot reach backend at ${API_URL}. Is NEXT_PUBLIC_API_URL set?`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      detail = json.detail || detail;
    } catch {
      if (text) detail += `: ${text.slice(0, 200)}`;
    }
    console.error("[auth] Backend error:", detail);
    throw new Error(detail);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string }> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error("Token refresh failed");
  return res.json();
}

export async function logoutBackend(accessToken: string): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}

export async function fetchMe(accessToken: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}
