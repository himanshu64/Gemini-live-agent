"use client";

import Link from "next/link";
import UserAvatar from "./UserAvatar";
import { useAuthContext } from "@/lib/auth/auth-provider";

export default function AuthButton() {
  const { user, logout } = useAuthContext();

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <UserAvatar src={user.avatar} name={user.name} size={28} />
        <span className="text-sm font-medium text-foreground hidden sm:inline">{user.name?.split(" ")[0]}</span>
      </Link>
      <button
        onClick={() => logout()}
        className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
