"use client";

import { usePageAnimations } from "@/hooks/usePageAnimations";
import { useAuthContext } from "@/lib/auth/auth-provider";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <header data-gsap="page-header" className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
          <Button variant="ghost" size="sm" className="rounded-lg text-sm" render={<Link href="/" />}>
            Back
          </Button>
        </div>
      </header>

      <div data-gsap="page-content" className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-6 max-w-lg mx-auto w-full">
        <Card data-gsap="fade-up" className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <UserAvatar src={user.avatar} name={user.name} size={80} />
              <div className="text-center">
                <p className="text-lg font-semibold text-card-foreground">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-muted-foreground">User ID</span>
              <span className="text-card-foreground font-mono text-xs">{user.id.slice(0, 16)}...</span>
              <span className="text-muted-foreground">Provider</span>
              <span className="text-card-foreground">Google</span>
              <span className="text-muted-foreground">Status</span>
              <span className="inline-flex w-fit items-center rounded-md border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Active
              </span>
            </div>
          </CardContent>
        </Card>

        <div data-gsap="fade-up" className="flex flex-col gap-3 mt-4">
          <Button
            variant="outline"
            className="rounded-lg"
            render={<Link href="/settings" />}
          >
            Settings
          </Button>
          <Button
            variant="outline"
            className="rounded-lg border-destructive/30 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => logout()}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </main>
  );
}
