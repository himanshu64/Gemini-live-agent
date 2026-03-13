"use client";
import { useCallback, useEffect, useState } from "react";
import { usePageAnimations } from "@/hooks/usePageAnimations";
import { useAuthContext } from "@/lib/auth/auth-provider";
import { API_URL } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

function formatMinutes(seconds: number): string {
  return `${Math.floor(seconds / 60)}`;
}

export default function DashboardPage() {
  const pageRef = usePageAnimations();
  const { user, getToken } = useAuthContext();
  const uid = user?.id;
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
    <main ref={pageRef} className="flex min-h-dvh flex-col bg-background">
      {/* ── Header ── */}
      <header data-gsap="page-header" className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          {/* Left: logo + title */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <span className="text-sm font-bold text-primary">S</span>
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Dashboard</h1>
          </div>

          {/* Right: pill nav */}
          <div className="flex items-center gap-1.5">
            {[
              { label: "Live", href: "/live" },
              { label: "Settings", href: "/settings" },
              { label: "Rewards", href: "/rewards" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-full px-3.5 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Admin
              </Link>
            )}
            {user?.avatar && (
              <Image src={user.avatar} alt="" width={32} height={32} className="rounded-full ring-2 ring-border ml-2" />
            )}
          </div>
        </div>
      </header>

      <div data-gsap="page-content" className="flex flex-1 flex-col max-w-6xl mx-auto w-full px-5 py-6">
        {/* ── Filter pills ── */}
        <div className="flex items-center gap-2 mb-6">
          <span className="rounded-full bg-muted/60 px-3.5 py-1.5 text-xs font-medium text-foreground">
            Tier: <span className="text-primary capitalize">{usage?.tier || "free"}</span>
          </span>
          <span className="rounded-full bg-muted/60 px-3.5 py-1.5 text-xs font-medium text-foreground">
            Status: <span className="text-primary">{user ? "Signed In" : "Guest"}</span>
          </span>
          <button
            onClick={fetchUsage}
            disabled={fetching}
            className="ml-auto rounded-full bg-muted/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {fetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── Card: Account ── */}
          <div data-gsap="fade-up" className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Account</h2>
            <div className="flex items-center gap-4 mb-5">
              {user?.avatar ? (
                <Image src={user.avatar} alt="" width={48} height={48} className="rounded-full ring-2 ring-border" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                  {user?.name?.charAt(0) || "?"}
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-foreground">{user?.name || "Guest"}</p>
                <p className="text-xs text-muted-foreground">{user?.email || "Not signed in"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-xl font-bold text-primary tabular-nums capitalize">{usage?.tier || "free"}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Tier</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-xl font-bold text-emerald-400 tabular-nums">
                  {user ? "Active" : "N/A"}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Status</p>
              </div>
            </div>
          </div>

          {/* ── Card: Usage Stats ── */}
          <div data-gsap="fade-up" className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Today&apos;s Usage</h2>

            {usage ? (
              <>
                {/* Big stat row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-400 tabular-nums">{formatMinutes(usage.today_seconds_used)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Min Used</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-400 tabular-nums">
                      {usage.today_seconds_remaining >= 0 ? formatMinutes(usage.today_seconds_remaining) : "\u221E"}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Min Left</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-400 tabular-nums">
                      {usage.today_seconds_limit > 0 ? formatMinutes(usage.today_seconds_limit) : "\u221E"}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Limit</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(usage.today_seconds_used)} used</span>
                    <span>{usage.today_seconds_remaining >= 0 ? `${formatTime(usage.today_seconds_remaining)} left` : "Unlimited"}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max(usedPct, 1)}%`,
                        background: usedPct > 80
                          ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                          : usedPct > 50
                            ? "linear-gradient(90deg, #34d399, #f59e0b)"
                            : "linear-gradient(90deg, #34d399, #3b82f6)",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center tabular-nums">{Math.round(usedPct)}% of daily limit used</p>
                </div>
              </>
            ) : !error ? (
              <div className="flex items-center justify-center py-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-primary" />
                  <p className="text-xs text-muted-foreground">Loading usage...</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Card: Plan Timeline ── */}
          <div data-gsap="fade-up" className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Plan Details</h2>
            <div className="space-y-3">
              {[
                { label: "Free tier", value: "30 min / day", color: "bg-emerald-400" },
                { label: "Resets", value: "Daily at midnight UTC", color: "bg-amber-400" },
                { label: "Features", value: "All modes", color: "bg-blue-400" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${row.color} shrink-0`} />
                  <span className="text-sm text-muted-foreground flex-1">{row.label}</span>
                  <span className="text-sm font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Visual bar (like the horizontal timeline in the design) */}
            <div className="mt-5 space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Usage Breakdown</p>
              <div className="flex gap-1 h-6">
                <div
                  className="rounded-full bg-emerald-400/80 transition-all duration-700"
                  style={{ width: usage ? `${Math.max(usedPct, 3)}%` : "3%" }}
                  title="Used"
                />
                <div
                  className="rounded-full bg-blue-400/40 flex-1 transition-all duration-700"
                  title="Remaining"
                />
              </div>
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400/80" /> Used</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400/40" /> Remaining</span>
              </div>
            </div>
          </div>

          {/* ── Card: Captured Frames ── */}
          <div data-gsap="fade-up" className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Captured Frames</h2>
              <button
                onClick={fetchFrames}
                disabled={framesLoading}
                className="rounded-full bg-muted/60 px-3 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {framesLoading ? "..." : "Refresh"}
              </button>
            </div>

            {framesLoading && frames.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-primary" />
                  <p className="text-xs text-muted-foreground">Loading frames...</p>
                </div>
              </div>
            ) : frames.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-48">
                  No captured frames yet. Ask the assistant to describe or save what it sees.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                {frames.map((frame) => (
                  <div key={frame.name} className="group relative rounded-xl overflow-hidden ring-1 ring-border/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frame.url}
                      alt="Captured frame"
                      className="h-20 w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] rounded-full bg-destructive/80 hover:bg-destructive px-2.5 py-1 h-auto min-h-0 min-w-0"
                        onClick={() => deleteFrame(frame.name)}
                        disabled={deletingFrame === frame.name}
                      >
                        {deletingFrame === frame.name ? "..." : "Delete"}
                      </Button>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <p className="text-[9px] text-white/80 truncate">
                        {frame.created ? new Date(frame.created).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div data-gsap="fade-up" className="mt-6 flex gap-3">
          <Link
            href="/live"
            className="flex-1 rounded-2xl bg-primary/10 ring-1 ring-primary/20 p-4 text-center hover:bg-primary/20 transition-colors"
          >
            <p className="text-sm font-semibold text-primary">Start Session</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Open the live assistant</p>
          </Link>
          <Link
            href="/settings"
            className="flex-1 rounded-2xl bg-muted/40 ring-1 ring-border/50 p-4 text-center hover:bg-muted/60 transition-colors"
          >
            <p className="text-sm font-semibold text-foreground">Settings</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Customize preferences</p>
          </Link>
          <Link
            href="/rewards"
            className="flex-1 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20 p-4 text-center hover:bg-amber-500/20 transition-colors"
          >
            <p className="text-sm font-semibold text-amber-400">Rewards</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Track your progress</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
