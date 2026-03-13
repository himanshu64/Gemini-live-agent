"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressValue } from "@/components/ui/progress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverviewStats {
  total_users: number;
  anonymous_users: number;
  google_users: number;
  admin_users: number;
  active_today: number;
  total_seconds_today: number;
  total_minutes_today: number;
}

interface UserRow {
  uid: string;
  email: string | null;
  tier: string;
  role: string;
  is_anonymous: boolean;
  disabled: boolean;
  created_at: string | null;
  today_seconds: number;
  today_minutes: number;
}

interface UsageTrend {
  date: string;
  total_seconds: number;
  total_minutes: number;
  active_users: number;
}

interface SessionRow {
  session_id: string;
  user_id: string | null;
  current_mode: string | null;
  created_at: string | null;
}

interface ErrorRow {
  session_id: string;
  event_id: string;
  event_type: string;
  data: Record<string, unknown>;
  timestamp: string | null;
}

interface JourneyStep {
  event_type: string;
  timestamp: string | null;
  data: Record<string, unknown>;
}

interface Journey {
  session_id: string;
  user_id: string | null;
  current_mode: string | null;
  steps: JourneyStep[];
  step_count: number;
  has_errors: boolean;
}

interface RetentionDay {
  date: string;
  active_users: number;
  returning_users: number;
  new_users: number;
  retention_rate: number;
}

interface ServerStats {
  total_connections: number;
  max_connections: number;
  connections_per_ip: Record<string, number>;
  max_per_ip: number;
  active_captcha_nonces: number;
  rate_limited_ips: number;
  turnstile_enabled: boolean;
}

type Tab = "overview" | "users" | "analytics" | "sessions" | "crashlytics" | "security";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function relativeTime(iso: string | null): string {
  if (!iso) return "N/A";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const MODE_COLORS: Record<string, string> = {
  navigation: "bg-blue-500/20 text-blue-400",
  reading: "bg-emerald-500/20 text-emerald-400",
  shopping: "bg-amber-500/20 text-amber-400",
  social: "bg-purple-500/20 text-purple-400",
  unknown: "bg-muted text-muted-foreground",
};

const STEP_COLORS: Record<string, string> = {
  error: "bg-red-500",
  crash: "bg-red-600",
  mode_change: "bg-purple-500",
  session_start: "bg-green-500",
  session_end: "bg-gray-500",
  default: "bg-foreground/40",
};

function stepColor(eventType: string): string {
  const lower = eventType.toLowerCase();
  for (const [key, color] of Object.entries(STEP_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return STEP_COLORS.default;
}

// ---------------------------------------------------------------------------
// Bar chart (pure CSS)
// ---------------------------------------------------------------------------

function BarChart({ data, labelKey, valueKey, maxValue, barColor }: {
  data: UsageTrend[];
  labelKey: keyof UsageTrend;
  valueKey: keyof UsageTrend;
  maxValue: number;
  barColor?: string;
}) {
  return (
    <div className="flex items-end gap-1.5 h-40">
      {data.map((item, i) => {
        const value = Number(item[valueKey]) || 0;
        const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const label = String(item[labelKey]);
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round(value)}</span>
            <div className="w-full flex items-end" style={{ height: "100px" }}>
              <div
                className={`w-full rounded-t-sm transition-all duration-500 ${barColor || "bg-foreground/80"}`}
                style={{ height: `${Math.max(height, 2)}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground truncate max-w-full">{shortDate(label)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const { uid, loading: authLoading, getToken } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [trends, setTrends] = useState<UsageTrend[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [modes, setModes] = useState<Record<string, number>>({});
  const [retention, setRetention] = useState<RetentionDay[]>([]);
  const [totalUnique, setTotalUnique] = useState(0);
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  // --- Fetch helper ---
  const adminFetch = useCallback(async <T,>(path: string): Promise<T | null> => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setAuthorized(false);
        return null;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAuthorized(true);
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      return null;
    }
  }, [getToken]);

  // --- Load data based on active tab ---
  const loadTabData = useCallback(async () => {
    if (!uid) return;
    setLoadingData(true);
    setError("");

    switch (tab) {
      case "overview": {
        const [statsData, modesData] = await Promise.all([
          adminFetch<OverviewStats>("/api/admin/stats"),
          adminFetch<{ modes: Record<string, number> }>("/api/admin/modes"),
        ]);
        if (statsData) setStats(statsData);
        if (modesData) setModes(modesData.modes);
        break;
      }
      case "users": {
        const data = await adminFetch<{ users: UserRow[] }>("/api/admin/users?limit=50");
        if (data) setUsers(data.users);
        break;
      }
      case "analytics": {
        const [trendsData, retentionData, journeysData] = await Promise.all([
          adminFetch<{ trends: UsageTrend[] }>("/api/admin/usage-trends?days=14"),
          adminFetch<{ daily_retention: RetentionDay[]; total_unique_users_period: number }>("/api/admin/retention?days=14"),
          adminFetch<{ journeys: Journey[] }>("/api/admin/journeys?limit=20"),
        ]);
        if (trendsData) setTrends(trendsData.trends);
        if (retentionData) {
          setRetention(retentionData.daily_retention);
          setTotalUnique(retentionData.total_unique_users_period);
        }
        if (journeysData) setJourneys(journeysData.journeys);
        break;
      }
      case "sessions": {
        const data = await adminFetch<{ sessions: SessionRow[] }>("/api/admin/sessions?limit=30");
        if (data) setSessions(data.sessions);
        break;
      }
      case "crashlytics": {
        const [errData, sessData] = await Promise.all([
          adminFetch<{ errors: ErrorRow[] }>("/api/admin/errors?limit=30"),
          adminFetch<{ sessions: SessionRow[] }>("/api/admin/sessions?limit=30"),
        ]);
        if (errData) setErrors(errData.errors);
        if (sessData) setSessions(sessData.sessions);
        break;
      }
      case "security": {
        const data = await adminFetch<ServerStats>("/api/admin/server-stats");
        if (data) setServerStats(data);
        break;
      }
    }
    setLoadingData(false);
  }, [uid, tab, adminFetch]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  // --- Toggle user disabled status ---
  const toggleUserDisabled = useCallback(async (targetUid: string, currentlyDisabled: boolean) => {
    setTogglingUser(targetUid);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/admin/users/${targetUid}/disable`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !currentlyDisabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers((prev) => prev.map((u) => u.uid === targetUid ? { ...u, disabled: !currentlyDisabled } : u));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setTogglingUser(null);
    }
  }, [getToken]);

  // --- Loading state ---
  if (authLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  // --- Unauthorized ---
  if (authorized === false) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5">
        <div className="text-center">
          <h1 className="font-serif text-2xl italic mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You need admin privileges to view this page.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Set <code className="bg-muted px-1.5 py-0.5 rounded text-xs">role: &quot;admin&quot;</code> on your user document in Firestore.
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" render={<Link href="/" />}>
          Back to Home
        </Button>
      </main>
    );
  }

  // --- Tab navigation ---
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "analytics", label: "Analytics" },
    { key: "sessions", label: "Sessions" },
    { key: "crashlytics", label: "Crashlytics" },
    { key: "security", label: "Security" },
  ];

  const maxTrendMinutes = Math.max(...(trends.length ? trends.map((t) => t.total_minutes) : [1]), 1);
  const maxTrendUsers = Math.max(...(trends.length ? trends.map((t) => t.active_users) : [1]), 1);
  const totalModes = Object.values(modes).reduce((a, b) => a + b, 0);

  return (
    <main className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl italic text-foreground">Admin</h1>
          <Badge variant="outline" className="text-[10px]">Dashboard</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={loadTabData} disabled={loadingData}>
            {loadingData ? "..." : "Refresh"}
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full text-xs" render={<Link href="/dashboard" />}>
            User
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full text-xs" render={<Link href="/" />}>
            Home
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pb-3 overflow-x-auto" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-foreground text-background"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-5 mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 px-5 pb-5">
        {loadingData && !stats && !users.length && !trends.length && !serverStats ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
              <p className="text-xs text-muted-foreground">Loading data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* ===================== OVERVIEW TAB ===================== */}
            {tab === "overview" && stats && (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: stats.total_users, label: "Total Users", color: "text-blue-400" },
                    { value: stats.active_today, label: "Active Today", color: "text-green-400" },
                    { value: `${stats.total_minutes_today}m`, label: "Usage Today", color: "text-amber-400" },
                    { value: stats.google_users, label: "Google Users", color: "text-purple-400" },
                  ].map((s) => (
                    <Card key={s.label} className="bg-card/50 backdrop-blur-sm">
                      <CardContent className="pt-4">
                        <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* User breakdown */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-serif italic text-lg">User Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      {[
                        { label: "Anonymous", count: stats.anonymous_users },
                        { label: "Google", count: stats.google_users },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{row.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium tabular-nums">{row.count}</span>
                            <Progress value={stats.total_users > 0 ? (row.count / stats.total_users) * 100 : 0} max={100} className="w-24">
                              <ProgressValue>{() => `${stats.total_users > 0 ? Math.round((row.count / stats.total_users) * 100) : 0}%`}</ProgressValue>
                            </Progress>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Admins</span>
                        <span className="text-sm font-medium tabular-nums">{stats.admin_users}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Mode distribution */}
                {totalModes > 0 && (
                  <Card className="bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="font-serif italic text-lg">Mode Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        {Object.entries(modes)
                          .sort(([, a], [, b]) => b - a)
                          .map(([mode, count]) => (
                            <div key={mode} className="flex items-center gap-3">
                              <Badge className={`text-[10px] shrink-0 ${MODE_COLORS[mode] || MODE_COLORS.unknown}`}>{mode}</Badge>
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-foreground/60 transition-all duration-500"
                                  style={{ width: `${(count / totalModes) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                                {count} ({Math.round((count / totalModes) * 100)}%)
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Platform health */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-serif italic text-lg">Platform Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-muted-foreground">Avg session today</span>
                      <span className="text-card-foreground">
                        {stats.active_today > 0
                          ? formatTime(Math.round(stats.total_seconds_today / stats.active_today))
                          : "N/A"}
                      </span>
                      <span className="text-muted-foreground">Conversion rate</span>
                      <span className="text-card-foreground">
                        {stats.total_users > 0
                          ? `${Math.round((stats.google_users / stats.total_users) * 100)}%`
                          : "N/A"}
                      </span>
                      <span className="text-muted-foreground">Anon to Google</span>
                      <span className="text-card-foreground">
                        {stats.anonymous_users > 0
                          ? `${stats.google_users} / ${stats.total_users}`
                          : "N/A"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ===================== USERS TAB ===================== */}
            {tab === "users" && (
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="font-serif italic text-lg">All Users ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No users found.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto -mx-1 px-1">
                      {users.map((u) => (
                        <div
                          key={u.uid}
                          className={`flex items-center gap-3 rounded-xl border p-3 ${u.disabled ? "border-red-500/20 bg-red-500/5 opacity-60" : "border-border bg-muted/30"}`}
                        >
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            u.disabled ? "bg-red-500/20 text-red-400" : u.role === "admin" ? "bg-amber-500/20 text-amber-400" : u.is_anonymous ? "bg-muted text-muted-foreground" : "bg-blue-500/20 text-blue-400"
                          }`}>
                            {u.disabled ? "X" : u.role === "admin" ? "A" : u.is_anonymous ? "?" : u.email?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium truncate ${u.disabled ? "text-muted-foreground line-through" : "text-card-foreground"}`}>
                                {u.email || "Anonymous"}
                              </p>
                              {u.role === "admin" && <Badge variant="outline" className="text-[9px] h-4">admin</Badge>}
                              {u.disabled && <Badge variant="destructive" className="text-[9px] h-4">disabled</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] text-muted-foreground font-mono">{u.uid.slice(0, 16)}...</p>
                              {u.created_at && (
                                <span className="text-[10px] text-muted-foreground/60">joined {relativeTime(u.created_at)}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-medium tabular-nums">{u.today_minutes}m</p>
                            <p className="text-[10px] text-muted-foreground">today</p>
                          </div>
                          <Badge variant={u.tier === "free" ? "secondary" : "default"} className="text-[10px] shrink-0">
                            {u.tier}
                          </Badge>
                          {u.role !== "admin" && (
                            <button
                              onClick={() => toggleUserDisabled(u.uid, u.disabled)}
                              disabled={togglingUser === u.uid}
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                                u.disabled
                                  ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30"
                                  : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                              }`}
                            >
                              {togglingUser === u.uid ? "..." : u.disabled ? "Enable" : "Disable"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ===================== ANALYTICS TAB ===================== */}
            {tab === "analytics" && (
              <>
                {/* Usage chart */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-serif italic text-lg">Usage (minutes/day)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {trends.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No usage data yet.</p>
                    ) : (
                      <BarChart data={trends} labelKey="date" valueKey="total_minutes" maxValue={maxTrendMinutes} barColor="bg-amber-500/80" />
                    )}
                  </CardContent>
                </Card>

                {/* Active users chart */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-serif italic text-lg">Active Users/Day</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {trends.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No data yet.</p>
                    ) : (
                      <BarChart data={trends} labelKey="date" valueKey="active_users" maxValue={maxTrendUsers} barColor="bg-blue-500/80" />
                    )}
                  </CardContent>
                </Card>

                {/* Retention */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="font-serif italic text-lg">Retention</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{totalUnique} unique users</Badge>
                  </CardHeader>
                  <CardContent>
                    {retention.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Not enough data for retention analysis.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <div className="grid grid-cols-4 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground pb-1 border-b border-border">
                          <span>Date</span>
                          <span className="text-right">Active</span>
                          <span className="text-right">Return</span>
                          <span className="text-right">Rate</span>
                        </div>
                        {retention.map((r) => (
                          <div key={r.date} className="grid grid-cols-4 gap-2 text-sm py-1">
                            <span className="text-muted-foreground">{shortDate(r.date)}</span>
                            <span className="text-right font-medium tabular-nums">{r.active_users}</span>
                            <span className="text-right tabular-nums">{r.returning_users}</span>
                            <span className={`text-right font-medium tabular-nums ${r.retention_rate >= 50 ? "text-green-400" : r.retention_rate >= 20 ? "text-amber-400" : "text-red-400"}`}>
                              {r.retention_rate}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* User Journeys */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="font-serif italic text-lg">User Journeys</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{journeys.length} sessions</Badge>
                  </CardHeader>
                  <CardContent>
                    {journeys.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No journey data yet. Events are logged during active sessions.</p>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto -mx-1 px-1">
                        {journeys.map((j) => (
                          <div
                            key={j.session_id}
                            className={`rounded-xl border p-3 ${j.has_errors ? "border-red-500/20 bg-red-500/5" : "border-border bg-muted/30"}`}
                          >
                            {/* Journey header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground">{j.session_id.slice(0, 12)}...</span>
                                {j.current_mode && (
                                  <Badge className={`text-[9px] h-4 ${MODE_COLORS[j.current_mode] || MODE_COLORS.unknown}`}>{j.current_mode}</Badge>
                                )}
                                {j.has_errors && <Badge variant="destructive" className="text-[9px] h-4">errors</Badge>}
                              </div>
                              <span className="text-[10px] text-muted-foreground tabular-nums">{j.step_count} steps</span>
                            </div>

                            {/* Journey timeline */}
                            {j.steps.length > 0 && (
                              <div className="flex items-center gap-0.5 overflow-x-auto py-1">
                                {j.steps.map((step, si) => (
                                  <div key={si} className="flex items-center gap-0.5 shrink-0" title={`${step.event_type}${step.timestamp ? ` — ${relativeTime(step.timestamp)}` : ""}`}>
                                    <div className={`h-3 w-3 rounded-full ${stepColor(step.event_type)}`} />
                                    {si < j.steps.length - 1 && <div className="h-px w-3 bg-border" />}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Step labels */}
                            {j.steps.length > 0 && j.steps.length <= 8 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {j.steps.map((step, si) => (
                                  <span key={si} className="text-[9px] text-muted-foreground/60 bg-muted/50 rounded px-1 py-0.5">
                                    {step.event_type}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Daily breakdown table */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-serif italic text-lg">Daily Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-1.5">
                      <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground pb-1 border-b border-border">
                        <span>Date</span>
                        <span className="text-right">Users</span>
                        <span className="text-right">Minutes</span>
                      </div>
                      {trends.map((t) => (
                        <div key={t.date} className="grid grid-cols-3 gap-2 text-sm py-1">
                          <span className="text-muted-foreground">{shortDate(t.date)}</span>
                          <span className="text-right font-medium tabular-nums">{t.active_users}</span>
                          <span className="text-right font-medium tabular-nums">{t.total_minutes}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ===================== SESSIONS TAB ===================== */}
            {tab === "sessions" && (
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-serif italic text-lg">Recent Sessions ({sessions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sessions found.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto -mx-1 px-1">
                      {sessions.map((s) => (
                        <div
                          key={s.session_id}
                          className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                            S
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-card-foreground truncate">{s.session_id.slice(0, 20)}...</p>
                            <p className="text-[11px] text-muted-foreground">
                              User: {s.user_id?.slice(0, 12) || "N/A"}...
                            </p>
                          </div>
                          {s.current_mode && (
                            <Badge className={`text-[10px] shrink-0 ${MODE_COLORS[s.current_mode] || MODE_COLORS.unknown}`}>{s.current_mode}</Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {relativeTime(s.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ===================== CRASHLYTICS TAB ===================== */}
            {tab === "crashlytics" && (
              <>
                {/* Firebase Console links */}
                <Card className="bg-card/50 backdrop-blur-sm border-blue-500/20">
                  <CardHeader>
                    <CardTitle className="font-serif italic text-lg">Firebase Console</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-muted-foreground">
                        Full Firebase Analytics, Crashlytics &amp; Performance dashboards:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "Analytics", path: "analytics", border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400", hover: "hover:bg-blue-500/20" },
                          { label: "Crashlytics", path: "crashlytics", border: "border-red-500/30", bg: "bg-red-500/10", text: "text-red-400", hover: "hover:bg-red-500/20" },
                          { label: "Performance", path: "performance", border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400", hover: "hover:bg-amber-500/20" },
                          { label: "Cloud Logging", path: "logs", border: "border-green-500/30", bg: "bg-green-500/10", text: "text-green-400", hover: "hover:bg-green-500/20" },
                        ].map((link) => (
                          <a
                            key={link.path}
                            href={`https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "_"}/${link.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 rounded-full border ${link.border} ${link.bg} px-3 py-1.5 text-xs ${link.text} ${link.hover} transition-colors`}
                          >
                            {link.label} <span aria-hidden="true">&rarr;</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stability overview */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-serif italic text-lg">Stability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                        <p className={`text-2xl font-bold ${errors.length === 0 ? "text-green-400" : "text-amber-400"}`}>
                          {sessions.length > 0
                            ? `${Math.max(0, 100 - Math.round((errors.length / Math.max(sessions.length, 1)) * 100))}%`
                            : "N/A"}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Crash-free</p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                        <p className="text-2xl font-bold text-red-400 tabular-nums">{errors.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Errors</p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400 tabular-nums">{sessions.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Sessions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Error frequency by type */}
                {errors.length > 0 && (
                  <Card className="bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="font-serif italic text-lg">Error Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        {Object.entries(
                          errors.reduce<Record<string, number>>((acc, e) => {
                            acc[e.event_type] = (acc[e.event_type] || 0) + 1;
                            return acc;
                          }, {})
                        )
                          .sort(([, a], [, b]) => b - a)
                          .map(([type, count]) => (
                            <div key={type} className="flex items-center gap-3">
                              <Badge variant="destructive" className="text-[10px] shrink-0">{type}</Badge>
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-red-500/60 transition-all"
                                  style={{ width: `${(count / errors.length) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums shrink-0">{count}x</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Error log */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="font-serif italic text-lg">Error Log</CardTitle>
                    <Badge variant={errors.length === 0 ? "secondary" : "destructive"} className="text-[10px]">
                      {errors.length === 0 ? "All clear" : `${errors.length} errors`}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    {errors.length === 0 ? (
                      <div className="flex flex-col items-center py-8 gap-2">
                        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                          <span className="text-green-400 text-lg">&#10003;</span>
                        </div>
                        <p className="text-sm text-muted-foreground">No errors detected. All clear!</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto -mx-1 px-1">
                        {errors.map((e, i) => (
                          <div
                            key={`${e.event_id}-${i}`}
                            className="rounded-xl border border-red-500/20 bg-red-500/5 p-3"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="destructive" className="text-[10px]">{e.event_type}</Badge>
                              <span className="text-[11px] text-muted-foreground">{relativeTime(e.timestamp)}</span>
                            </div>
                            <p className="text-xs font-mono text-muted-foreground truncate">
                              Session: {e.session_id.slice(0, 24)}...
                            </p>
                            {Object.keys(e.data).length > 0 && (
                              <pre className="mt-2 text-[10px] text-red-300/70 bg-red-500/5 rounded-lg p-2 overflow-x-auto">
                                {JSON.stringify(e.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ===================== SECURITY TAB ===================== */}
            {tab === "security" && (
              <>
                {/* Captcha status */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-serif italic text-lg">CAPTCHA Protection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                        <p className={`text-lg font-bold ${serverStats?.turnstile_enabled ? "text-green-400" : "text-amber-400"}`}>
                          {serverStats?.turnstile_enabled ? "Active" : "Pass-through"}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Turnstile</p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-blue-400 tabular-nums">{serverStats?.active_captcha_nonces ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Active Nonces</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className="text-card-foreground">Cloudflare Turnstile (Invisible)</span>
                      <span className="text-muted-foreground">Mode</span>
                      <span className="text-card-foreground">{serverStats?.turnstile_enabled ? "Enforcing" : "Disabled (nonce pass-through)"}</span>
                      <span className="text-muted-foreground">Nonce TTL</span>
                      <span className="text-card-foreground">60 seconds</span>
                    </div>
                  </CardContent>
                </Card>

                {/* DDoS protection */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-serif italic text-lg">DDoS Protection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground tabular-nums">
                          {serverStats?.total_connections ?? 0} / {serverStats?.max_connections ?? 50}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">WS Connections</p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground tabular-nums">{serverStats?.rate_limited_ips ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Tracked IPs</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-muted-foreground">Max per IP</span>
                      <span className="text-card-foreground">{serverStats?.max_per_ip ?? 3} connections</span>
                      <span className="text-muted-foreground">Max total</span>
                      <span className="text-card-foreground">{serverStats?.max_connections ?? 50} connections</span>
                      <span className="text-muted-foreground">HTTP rate limit</span>
                      <span className="text-card-foreground">60 req/min per IP</span>
                      <span className="text-muted-foreground">WS rate limit</span>
                      <span className="text-card-foreground">30 msg/sec (disconnect at 10 drops)</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Active connections by IP */}
                {serverStats && Object.keys(serverStats.connections_per_ip).length > 0 && (
                  <Card className="bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="font-serif italic text-lg">Active Connections by IP</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-1.5">
                        <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground pb-1 border-b border-border">
                          <span>IP Address</span>
                          <span className="text-right">Connections</span>
                        </div>
                        {Object.entries(serverStats.connections_per_ip)
                          .sort(([, a], [, b]) => b - a)
                          .map(([ip, count]) => (
                            <div key={ip} className="grid grid-cols-2 gap-2 text-sm py-1">
                              <span className="text-muted-foreground font-mono text-xs">{ip}</span>
                              <span className={`text-right font-medium tabular-nums ${count >= serverStats.max_per_ip ? "text-red-400" : "text-card-foreground"}`}>
                                {count} / {serverStats.max_per_ip}
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Security headers */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-serif italic text-lg">Security Headers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { header: "Content-Security-Policy", status: true },
                        { header: "X-Content-Type-Options", status: true },
                        { header: "X-Frame-Options", status: true },
                        { header: "Strict-Transport-Security", status: true },
                        { header: "Referrer-Policy", status: true },
                        { header: "Permissions-Policy", status: true },
                        { header: "CORS (restricted origin)", status: true },
                      ].map((h) => (
                        <div key={h.header} className="flex items-center justify-between py-1">
                          <span className="text-xs text-muted-foreground font-mono">{h.header}</span>
                          <span className={`text-[10px] font-medium ${h.status ? "text-green-400" : "text-red-400"}`}>
                            {h.status ? "Enabled" : "Missing"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
