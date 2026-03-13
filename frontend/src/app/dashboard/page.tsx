"use client";
import { useCallback, useEffect, useState } from "react";
import { usePageAnimations } from "@/hooks/usePageAnimations";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

interface FrameData {
  name: string;
  url: string;
  created: string | null;
  size: number;
}

interface UsageData {
  uid: string;
  tier: string;
  today_seconds_used: number;
  today_seconds_limit: number;
  today_seconds_remaining: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function DashboardPage() {
  const pageRef = usePageAnimations();
  const { user, uid, getToken } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(false);
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [framesLoading, setFramesLoading] = useState(false);
  const [deletingFrame, setDeletingFrame] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUsage = useCallback(async () => {
    if (!uid) return;
    setFetching(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch usage");
    } finally {
      setFetching(false);
    }
  }, [uid, getToken]);

  const fetchFrames = useCallback(async () => {
    if (!uid) return;
    setFramesLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/frames`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFrames(data.frames ?? []);
    } catch {
      // silent — frames section is non-critical
    } finally {
      setFramesLoading(false);
    }
  }, [uid, getToken]);

  const deleteFrame = useCallback(async (name: string) => {
    setDeletingFrame(name);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/frames`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFrames((prev) => prev.filter((f) => f.name !== name));
    } catch {
      // silent
    } finally {
      setDeletingFrame(null);
    }
  }, [getToken]);

  useEffect(() => {
    if (uid) {
      fetchUsage();
      fetchFrames();
      getToken().then((token) =>
        fetch(`${API_URL}/api/admin/check`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).then((res) => {
        if (res.ok) setIsAdmin(true);
      }).catch(() => {});
    }
  }, [uid, fetchUsage, fetchFrames, getToken]);

  const usedPct = usage && usage.today_seconds_limit > 0
    ? Math.min(100, (usage.today_seconds_used / usage.today_seconds_limit) * 100)
    : 0;

  return (
    <main ref={pageRef} className="flex min-h-dvh flex-col">
      <header data-gsap="page-header" className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" className="rounded-lg text-xs border-primary/30 text-primary" render={<Link href="/admin" />}>
                Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" className="rounded-lg text-sm" render={<Link href="/" />}>
              Back
            </Button>
          </div>
        </div>
      </header>

      <div data-gsap="page-content" className="flex flex-1 flex-col gap-4 px-5 pb-5">
        {/* Account */}
        <Card data-gsap="fade-up" className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {user?.photoURL && (
                <div className="flex items-center gap-3">
                  <Image src={user.photoURL} alt="" width={40} height={40} className="rounded-full ring-2 ring-border" />
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">User ID</span>
                <span className="text-card-foreground font-mono text-xs">{uid?.slice(0, 12)}...</span>
                <span className="text-muted-foreground">Status</span>
                <span className="text-card-foreground">{user?.email ? "Signed in" : "Guest"}</span>
                <span className="text-muted-foreground">Tier</span>
                <span className="inline-flex w-fit items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium capitalize">{usage?.tier || "free"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card data-gsap="fade-up" className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Today&apos;s Usage</CardTitle>
            <Button variant="outline" size="sm" className="rounded-full border-foreground/20 text-xs" onClick={fetchUsage} disabled={fetching}>
              {fetching ? "..." : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent>
            {error && <p className="text-destructive text-sm mb-3">{error}</p>}

            {usage ? (
              <div className="flex flex-col gap-4">
                <Progress value={usedPct} max={100}>
                  <ProgressLabel>{formatTime(usage.today_seconds_used)} used</ProgressLabel>
                  <ProgressValue>
                    {() =>
                      usage.today_seconds_remaining >= 0
                        ? `${formatTime(usage.today_seconds_remaining)} left`
                        : "Unlimited"
                    }
                  </ProgressValue>
                </Progress>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: formatTime(usage.today_seconds_used), label: "Used" },
                    { value: usage.today_seconds_remaining >= 0 ? formatTime(usage.today_seconds_remaining) : "\u221E", label: "Left" },
                    { value: usage.today_seconds_limit > 0 ? formatTime(usage.today_seconds_limit) : "\u221E", label: "Limit" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : !error ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
                <p className="text-muted-foreground text-sm">Loading usage data...</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Plan */}
        <Card data-gsap="fade-up" className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Plan Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Free tier</span>
              <span className="text-card-foreground">30 minutes / day</span>
              <span className="text-muted-foreground">Resets</span>
              <span className="text-card-foreground">Daily at midnight UTC</span>
              <span className="text-muted-foreground">Features</span>
              <span className="text-card-foreground">All modes</span>
            </div>
          </CardContent>
        </Card>

        {/* Captured Frames */}
        <Card data-gsap="fade-up" className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Captured Frames</CardTitle>
            <Button variant="outline" size="sm" className="rounded-full border-foreground/20 text-xs" onClick={fetchFrames} disabled={framesLoading}>
              {framesLoading ? "..." : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent>
            {framesLoading && frames.length === 0 ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
                <p className="text-muted-foreground text-sm">Loading frames...</p>
              </div>
            ) : frames.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No captured frames yet. The assistant captures frames when you ask it to describe or save what it sees.
              </p>
            ) : (
              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
                {frames.map((frame) => (
                  <div key={frame.name} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frame.url}
                      alt="Captured frame"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-card-foreground truncate">
                        {frame.created ? new Date(frame.created).toLocaleString() : "Unknown date"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {frame.size ? `${(frame.size / 1024).toFixed(1)} KB` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs text-destructive hover:text-destructive"
                      onClick={() => deleteFrame(frame.name)}
                      disabled={deletingFrame === frame.name}
                      aria-label="Delete frame"
                    >
                      {deletingFrame === frame.name ? "..." : "Delete"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
