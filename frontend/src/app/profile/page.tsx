"use client";

import { usePageAnimations } from "@/hooks/usePageAnimations";
import { useAuthContext } from "@/lib/auth/auth-provider";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const pageRef = usePageAnimations();
  const { user, logout } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) return null;

  return (
    <main ref={pageRef} className="flex min-h-dvh flex-col">
      {/* Header */}
      <header data-gsap="page-header" className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <span className="text-sm font-bold text-primary">S</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Profile</h1>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-border/50 px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-border/50 px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="rounded-full border border-border/50 px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <div data-gsap="page-content" className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-6 max-w-lg mx-auto w-full">
        {/* Account card */}
        <div data-gsap="fade-up" className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Account</h2>
          <div className="flex flex-col items-center gap-4">
            <UserAvatar src={user.avatar} name={user.name} size={80} />
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div data-gsap="fade-up" className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Details</h2>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-muted-foreground">User ID</span>
            <span className="text-foreground font-mono text-xs">{user.id.slice(0, 16)}...</span>
            <span className="text-muted-foreground">Provider</span>
            <span className="text-foreground">Google</span>
            <span className="text-muted-foreground">Status</span>
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 ring-1 ring-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
              Active
            </span>
          </div>
        </div>

        {/* Actions */}
        <div data-gsap="fade-up" className="flex flex-col gap-3 mt-4">
          <Link
            href="/settings"
            className="flex items-center justify-center rounded-full border border-border/50 px-6 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            Settings
          </Link>
          <button
            onClick={() => logout()}
            className="rounded-full border border-destructive/30 px-6 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}
