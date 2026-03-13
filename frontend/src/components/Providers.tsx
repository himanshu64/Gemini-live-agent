"use client";

import { AuthProvider, type AuthUser } from "@/lib/auth/auth-provider";

export default function Providers({ children, initialUser }: { children: React.ReactNode; initialUser?: AuthUser | null }) {
  return <AuthProvider initialUser={initialUser ?? null}>{children}</AuthProvider>;
}
