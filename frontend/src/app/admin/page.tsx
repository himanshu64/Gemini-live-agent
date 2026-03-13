"use client";
import { useCallback, useEffect, useState } from "react";
import { usePageAnimations } from "@/hooks/usePageAnimations";
import { useAuthContext } from "@/lib/auth/auth-provider";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

type Tab = "overview" | "users" | "analytics" | "sessions" | "crashlytics" | "security" | "feedback";

interface FeedbackRow {
  id: string;
  name: string;
  email: string | null;
  message: string;
  created_at: number | null;
}

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

const MODE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  navigation: { bg: "bg-blue-500/10", text: "text-blue-400", bar: "bg-blue-400" },
  reading: { bg: "bg-emerald-500/10", text: "text-emerald-400", bar: "bg-emerald-400" },
  shopping: { bg: "bg-amber-500/10", text: "text-amber-400", bar: "bg-amber-400" },
  social: { bg: "bg-purple-500/10", text: "text-purple-400", bar: "bg-purple-400" },
  unknown: { bg: "bg-muted", text: "text-muted-foreground", bar: "bg-muted-foreground" },
};

const STEP_COLORS: Record<string, string> = {
  error: "bg-red-500",
  crash: "bg-red-600",
  mode_change: "bg-purple-500",
  session_start: "bg-emerald-500",
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

function getModeStyle(mode: string | null) {
  return MODE_COLORS[mode || "unknown"] || MODE_COLORS.unknown;
}

// ---------------------------------------------------------------------------
// Rounded bar chart (Dribbble-style with pill bars)
// ---------------------------------------------------------------------------

function PillBarChart({ data, labelKey, valueKey, maxValue, barColor }: {
  data: UsageTrend[];
  labelKey: keyof UsageTrend;
  valueKey: keyof UsageTrend;
  maxValue: number;
  barColor?: string;
}) {
  return (
    <div className="flex items-end gap-2 h-36">
      {data.map((item, i) => {
        const value = Number(item[valueKey]) || 0;
        const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const label = String(item[labelKey]);
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round(value)}</span>
            <div className="w-full flex items-end justify-center" style={{ height: "90px" }}>
              <div
                className={`w-3/4 rounded-full transition-all duration-700 ease-out ${barColor || "bg-primary/80"}`}
                style={{ height: `${Math.max(height, 4)}%` }}
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
// Horizontal bar (timeline style)
// ---------------------------------------------------------------------------

function HorizontalBar({ label, value, maxValue, color }: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-foreground w-10 text-right shrink-0">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const pageRef = usePageAnimations();
  const { user, getToken } = useAuthContext();
  const uid = user?.id || null;
  const router = useRouter();
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
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
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
      case "feedback": {
        const data = await adminFetch<{ feedback: FeedbackRow[] }>("/api/admin/feedback");
        if (data) setFeedback(data.feedback);
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

  useEffect(() => { if (!user) router.replace("/login"); }, [user, router]);

  if (!user) return null;

  // --- Unauthorized ---
  if (authorized === false) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5">
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl text-destructive">!</span>
          </div>
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            You need admin privileges to view this page.
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
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "\u25C9" },
    { key: "users", label: "Users", icon: "\u2687" },
    { key: "analytics", label: "Analytics", icon: "\u2261" },
    { key: "sessions", label: "Sessions", icon: "\u21C4" },
    { key: "crashlytics", label: "Crashes", icon: "\u26A0" },
    { key: "security", label: "Security", icon: "\u2603" },
    { key: "feedback", label: "Feedback", icon: "\u2709" },
  ];

  const maxTrendMinutes = Math.max(...(trends.length ? trends.map((t) => t.total_minutes) : [1]), 1);
  const maxTrendUsers = Math.max(...(trends.length ? trends.map((t) => t.active_users) : [1]), 1);
  const totalModes = Object.values(modes).reduce((a, b) => a + b, 0);

  return (
    <main ref={pageRef} className="flex min-h-dvh flex-col bg-background">
      {/* ── Header ── */}
      <header data-gsap="page-header" className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <span className="text-sm font-bold text-primary">S</span>
            </div>

            {/* Pill tab nav */}
            <nav className="hidden md:flex items-center gap-1 ml-3">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    tab === t.key
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <span className="text-[10px]">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadTabData}
              disabled={loadingData}
              className="rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {loadingData ? "..." : "Refresh"}
            </button>
            <Link href="/dashboard" className="rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              User
            </Link>
            <Link href="/" className="rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Home
            </Link>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden flex gap-1 px-5 pb-3 overflow-x-auto" role="tablist">
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
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="max-w-7xl mx-auto w-full px-5 pt-4">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div data-gsap="page-content" className="flex flex-1 flex-col max-w-7xl mx-auto w-full px-5 py-6">
        {loadingData && !stats && !users.length && !trends.length && !serverStats ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-primary" />
              <p className="text-xs text-muted-foreground">Loading data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* ===================== OVERVIEW TAB ===================== */}
            {tab === "overview" && stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stat cards row */}
                <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: stats.total_users, label: "Total Users", color: "text-blue-400", bg: "bg-blue-400" },
                    { value: stats.active_today, label: "Active Today", color: "text-emerald-400", bg: "bg-emerald-400" },
                    { value: `${stats.total_minutes_today}m`, label: "Usage Today", color: "text-amber-400", bg: "bg-amber-400" },
                    { value: stats.google_users, label: "Google Users", color: "text-purple-400", bg: "bg-purple-400" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`h-2 w-2 rounded-full ${s.bg}`} />
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</span>
                      </div>
                      <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* User Breakdown */}
                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">User Breakdown</h2>
                  <div className="space-y-3">
                    {[
                      { label: "Anonymous", count: stats.anonymous_users, color: "bg-muted-foreground" },
                      { label: "Google", count: stats.google_users, color: "bg-blue-400" },
                      { label: "Admins", count: stats.admin_users, color: "bg-amber-400" },
                    ].map((row) => (
                      <HorizontalBar
                        key={row.label}
                        label={row.label}
                        value={row.count}
                        maxValue={stats.total_users}
                        color={row.color}
                      />
                    ))}
                  </div>
                  <div className="flex gap-4 mt-4 pt-3 border-t border-border/50">
                    {[
                      { label: "Anonymous", color: "bg-muted-foreground" },
                      { label: "Google", color: "bg-blue-400" },
                      { label: "Admin", color: "bg-amber-400" },
                    ].map((l) => (
                      <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className={`h-2 w-2 rounded-full ${l.color}`} />
                        {l.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mode Distribution */}
                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">Mode Distribution</h2>
                  {totalModes > 0 ? (
                    <>
                      <div className="space-y-3">
                        {Object.entries(modes)
                          .sort(([, a], [, b]) => b - a)
                          .map(([mode, count]) => {
                            const style = getModeStyle(mode);
                            return (
                              <HorizontalBar
                                key={mode}
                                label={mode}
                                value={count}
                                maxValue={totalModes}
                                color={style.bar}
                              />
                            );
                          })}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-border/50 tabular-nums">
                        Total: {totalModes} mode activations
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No mode data yet.</p>
                  )}
                </div>

                {/* Platform Health */}
                <div className="md:col-span-2 rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">Platform Health</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl bg-muted/30 p-4 text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {stats.active_today > 0
                          ? formatTime(Math.round(stats.total_seconds_today / stats.active_today))
                          : "N/A"}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Avg Session</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                        {stats.total_users > 0
                          ? `${Math.round((stats.google_users / stats.total_users) * 100)}%`
                          : "N/A"}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Conversion</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 p-4 text-center">
                      <p className="text-2xl font-bold text-blue-400 tabular-nums">
                        {stats.google_users} / {stats.total_users}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Google / Total</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===================== USERS TAB ===================== */}
            {tab === "users" && (
              <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    All Users <span className="text-foreground ml-1">({users.length})</span>
                  </h2>
                </div>
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users found.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
                    {users.map((u) => (
                      <div
                        key={u.uid}
                        className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                          u.disabled
                            ? "bg-destructive/5 ring-1 ring-destructive/20 opacity-60"
                            : "bg-muted/30 ring-1 ring-border/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          u.disabled ? "bg-destructive/10 text-destructive" : u.role === "admin" ? "bg-amber-500/10 text-amber-400" : u.is_anonymous ? "bg-muted text-muted-foreground" : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {u.disabled ? "X" : u.role === "admin" ? "A" : u.is_anonymous ? "?" : u.email?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${u.disabled ? "text-muted-foreground line-through" : "text-foreground"}`}>
                              {u.email || "Anonymous"}
                            </p>
                            {u.role === "admin" && (
                              <span className="rounded-full bg-amber-500/10 text-amber-400 px-2 py-0.5 text-[9px] font-medium">admin</span>
                            )}
                            {u.disabled && (
                              <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[9px] font-medium">disabled</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] text-muted-foreground font-mono">{u.uid.slice(0, 16)}...</p>
                            {u.created_at && (
                              <span className="text-[10px] text-muted-foreground/60">joined {relativeTime(u.created_at)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold tabular-nums text-foreground">{u.today_minutes}m</p>
                          <p className="text-[10px] text-muted-foreground">today</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                          u.tier === "free" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                        }`}>
                          {u.tier}
                        </span>
                        {u.role !== "admin" && (
                          <button
                            onClick={() => toggleUserDisabled(u.uid, u.disabled)}
                            disabled={togglingUser === u.uid}
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                              u.disabled
                                ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 ring-1 ring-emerald-500/30"
                                : "bg-destructive/10 text-destructive hover:bg-destructive/20 ring-1 ring-destructive/30"
                            }`}
                          >
                            {togglingUser === u.uid ? "..." : u.disabled ? "Enable" : "Disable"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================== ANALYTICS TAB ===================== */}
            {tab === "analytics" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Usage chart */}
                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Usage (min/day)</h2>
                  {trends.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No usage data yet.</p>
                  ) : (
                    <PillBarChart data={trends} labelKey="date" valueKey="total_minutes" maxValue={maxTrendMinutes} barColor="bg-amber-400/80" />
                  )}
                </div>

                {/* Active users chart */}
                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Active Users/Day</h2>
                  {trends.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data yet.</p>
                  ) : (
                    <PillBarChart data={trends} labelKey="date" valueKey="active_users" maxValue={maxTrendUsers} barColor="bg-blue-400/80" />
                  )}
                </div>

                {/* Retention */}
                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Retention</h2>
                    <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">{totalUnique} unique</span>
                  </div>
                  {retention.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Not enough data for retention analysis.</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="grid grid-cols-4 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/50">
                        <span>Date</span>
                        <span className="text-right">Active</span>
                        <span className="text-right">Return</span>
                        <span className="text-right">Rate</span>
                      </div>
                      {retention.map((r) => (
                        <div key={r.date} className="grid grid-cols-4 gap-2 text-sm py-1.5">
                          <span className="text-muted-foreground text-xs">{shortDate(r.date)}</span>
                          <span className="text-right font-medium tabular-nums text-xs">{r.active_users}</span>
                          <span className="text-right tabular-nums text-xs">{r.returning_users}</span>
                          <span className={`text-right font-bold tabular-nums text-xs ${r.retention_rate >= 50 ? "text-emerald-400" : r.retention_rate >= 20 ? "text-amber-400" : "text-red-400"}`}>
                            {r.retention_rate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User Journeys */}
                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">User Journeys</h2>
                    <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">{journeys.length} sessions</span>
                  </div>
                  {journeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No journey data yet.</p>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
                      {journeys.map((j) => (
                        <div
                          key={j.session_id}
                          className={`rounded-xl p-3 ${j.has_errors ? "bg-destructive/5 ring-1 ring-destructive/20" : "bg-muted/30 ring-1 ring-border/30"}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground">{j.session_id.slice(0, 12)}...</span>
                              {j.current_mode && (
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${getModeStyle(j.current_mode).bg} ${getModeStyle(j.current_mode).text}`}>
                                  {j.current_mode}
                                </span>
                              )}
                              {j.has_errors && (
                                <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[9px] font-medium">errors</span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{j.step_count} steps</span>
                          </div>

                          {/* Timeline dots */}
                          {j.steps.length > 0 && (
                            <div className="flex items-center gap-0.5 overflow-x-auto py-1">
                              {j.steps.map((step, si) => (
                                <div key={si} className="flex items-center gap-0.5 shrink-0" title={`${step.event_type}${step.timestamp ? ` — ${relativeTime(step.timestamp)}` : ""}`}>
                                  <div className={`h-3 w-3 rounded-full ${stepColor(step.event_type)}`} />
                                  {si < j.steps.length - 1 && <div className="h-px w-3 bg-border/50" />}
                                </div>
                              ))}
                            </div>
                          )}

                          {j.steps.length > 0 && j.steps.length <= 8 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {j.steps.map((step, si) => (
                                <span key={si} className="text-[9px] text-muted-foreground/60 bg-muted/50 rounded-full px-1.5 py-0.5">
                                  {step.event_type}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Daily breakdown */}
                <div className="md:col-span-2 rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Daily Breakdown</h2>
                  <div className="flex flex-col gap-1">
                    <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/50">
                      <span>Date</span>
                      <span className="text-right">Users</span>
                      <span className="text-right">Minutes</span>
                    </div>
                    {trends.map((t) => (
                      <div key={t.date} className="grid grid-cols-3 gap-2 text-sm py-1.5">
                        <span className="text-muted-foreground text-xs">{shortDate(t.date)}</span>
                        <span className="text-right font-medium tabular-nums text-xs">{t.active_users}</span>
                        <span className="text-right font-medium tabular-nums text-xs">{t.total_minutes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===================== SESSIONS TAB ===================== */}
            {tab === "sessions" && (
              <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
                  Recent Sessions <span className="text-foreground ml-1">({sessions.length})</span>
                </h2>
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sessions found.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
                    {sessions.map((s) => (
                      <div
                        key={s.session_id}
                        className="flex items-center gap-3 rounded-xl bg-muted/30 ring-1 ring-border/30 p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">
                          S
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-foreground truncate">{s.session_id.slice(0, 20)}...</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            User: {s.user_id?.slice(0, 12) || "N/A"}...
                          </p>
                        </div>
                        {s.current_mode && (
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${getModeStyle(s.current_mode).bg} ${getModeStyle(s.current_mode).text}`}>
                            {s.current_mode}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                          {relativeTime(s.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================== CRASHLYTICS TAB ===================== */}
            {tab === "crashlytics" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Firebase Console links */}
                <div className="md:col-span-2 rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-blue-500/20 p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Firebase Console</h2>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Analytics", path: "analytics", color: "bg-blue-400/10 text-blue-400 ring-blue-400/20 hover:bg-blue-400/20" },
                      { label: "Crashlytics", path: "crashlytics", color: "bg-red-400/10 text-red-400 ring-red-400/20 hover:bg-red-400/20" },
                      { label: "Performance", path: "performance", color: "bg-amber-400/10 text-amber-400 ring-amber-400/20 hover:bg-amber-400/20" },
                      { label: "Cloud Logging", path: "logs", color: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20 hover:bg-emerald-400/20" },
                    ].map((link) => (
                      <a
                        key={link.path}
                        href={`https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "_"}/${link.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 rounded-full ring-1 px-3.5 py-1.5 text-xs font-medium transition-colors ${link.color}`}
                      >
                        {link.label} <span aria-hidden="true">&rarr;</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Stability */}
                <div className="md:col-span-2 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5 text-center">
                    <p className={`text-3xl font-bold ${errors.length === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {sessions.length > 0
                        ? `${Math.max(0, 100 - Math.round((errors.length / Math.max(sessions.length, 1)) * 100))}%`
                        : "N/A"}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Crash-free</p>
                  </div>
                  <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5 text-center">
                    <p className="text-3xl font-bold text-red-400 tabular-nums">{errors.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Errors</p>
                  </div>
                  <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5 text-center">
                    <p className="text-3xl font-bold text-blue-400 tabular-nums">{sessions.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Sessions</p>
                  </div>
                </div>

                {/* Error frequency by type */}
                {errors.length > 0 && (
                  <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Error Types</h2>
                    <div className="space-y-3">
                      {Object.entries(
                        errors.reduce<Record<string, number>>((acc, e) => {
                          acc[e.event_type] = (acc[e.event_type] || 0) + 1;
                          return acc;
                        }, {})
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <HorizontalBar
                            key={type}
                            label={type}
                            value={count}
                            maxValue={errors.length}
                            color="bg-red-400/80"
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Error log */}
                <div className={`rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5 ${errors.length > 0 ? "" : "md:col-span-2"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Error Log</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                      errors.length === 0 ? "bg-emerald-400/10 text-emerald-400" : "bg-destructive/10 text-destructive"
                    }`}>
                      {errors.length === 0 ? "All clear" : `${errors.length} errors`}
                    </span>
                  </div>
                  {errors.length === 0 ? (
                    <div className="flex flex-col items-center py-8 gap-2">
                      <div className="h-12 w-12 rounded-full bg-emerald-400/10 flex items-center justify-center">
                        <span className="text-emerald-400 text-lg">&#10003;</span>
                      </div>
                      <p className="text-sm text-muted-foreground">No errors detected. All clear!</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
                      {errors.map((e, i) => (
                        <div
                          key={`${e.event_id}-${i}`}
                          className="rounded-xl bg-destructive/5 ring-1 ring-destructive/20 p-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-medium">{e.event_type}</span>
                            <span className="text-[11px] text-muted-foreground tabular-nums">{relativeTime(e.timestamp)}</span>
                          </div>
                          <p className="text-xs font-mono text-muted-foreground truncate">
                            Session: {e.session_id.slice(0, 24)}...
                          </p>
                          {Object.keys(e.data).length > 0 && (
                            <pre className="mt-2 text-[10px] text-red-300/70 bg-destructive/5 rounded-lg p-2 overflow-x-auto">
                              {JSON.stringify(e.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===================== SECURITY TAB ===================== */}
            {tab === "security" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CAPTCHA */}
                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">CAPTCHA Protection</h2>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl bg-muted/30 p-3 text-center">
                      <p className={`text-lg font-bold ${serverStats?.turnstile_enabled ? "text-emerald-400" : "text-amber-400"}`}>
                        {serverStats?.turnstile_enabled ? "Active" : "Pass-through"}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Turnstile</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 p-3 text-center">
                      <p className="text-lg font-bold text-blue-400 tabular-nums">{serverStats?.active_captcha_nonces ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Active Nonces</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Type", value: "Cloudflare Turnstile (Invisible)" },
                      { label: "Mode", value: serverStats?.turnstile_enabled ? "Enforcing" : "Disabled (pass-through)" },
                      { label: "Nonce TTL", value: "60 seconds" },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center justify-between py-1">
                        <span className="text-xs text-muted-foreground">{r.label}</span>
                        <span className="text-xs text-foreground">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DDoS */}
                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">DDoS Protection</h2>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl bg-muted/30 p-3 text-center">
                      <p className="text-lg font-bold text-foreground tabular-nums">
                        {serverStats?.total_connections ?? 0} / {serverStats?.max_connections ?? 50}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">WS Connections</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 p-3 text-center">
                      <p className="text-lg font-bold text-foreground tabular-nums">{serverStats?.rate_limited_ips ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Tracked IPs</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Max per IP", value: `${serverStats?.max_per_ip ?? 3} connections` },
                      { label: "Max total", value: `${serverStats?.max_connections ?? 50} connections` },
                      { label: "HTTP rate limit", value: "60 req/min per IP" },
                      { label: "WS rate limit", value: "30 msg/sec" },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center justify-between py-1">
                        <span className="text-xs text-muted-foreground">{r.label}</span>
                        <span className="text-xs text-foreground">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connections by IP */}
                {serverStats && Object.keys(serverStats.connections_per_ip).length > 0 && (
                  <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Connections by IP</h2>
                    <div className="space-y-2">
                      {Object.entries(serverStats.connections_per_ip)
                        .sort(([, a], [, b]) => b - a)
                        .map(([ip, count]) => (
                          <div key={ip} className="flex items-center justify-between py-1">
                            <span className="text-xs text-muted-foreground font-mono">{ip}</span>
                            <span className={`text-xs font-bold tabular-nums ${count >= serverStats.max_per_ip ? "text-red-400" : "text-foreground"}`}>
                              {count} / {serverStats.max_per_ip}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Security headers */}
                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Security Headers</h2>
                  <div className="space-y-1.5">
                    {[
                      "Content-Security-Policy",
                      "X-Content-Type-Options",
                      "X-Frame-Options",
                      "Strict-Transport-Security",
                      "Referrer-Policy",
                      "Permissions-Policy",
                      "CORS (restricted origin)",
                    ].map((h) => (
                      <div key={h} className="flex items-center justify-between py-1">
                        <span className="text-[11px] text-muted-foreground font-mono">{h}</span>
                        <span className="text-[10px] font-medium text-emerald-400">Enabled</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===================== FEEDBACK TAB ===================== */}
            {tab === "feedback" && (
              <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
                  User Feedback <span className="text-foreground ml-1">({feedback.length})</span>
                </h2>
                {feedback.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
                    {feedback.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-xl bg-muted/30 ring-1 ring-border/30 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                              {f.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-foreground">{f.name}</span>
                              {f.email && (
                                <span className="text-[11px] text-muted-foreground ml-2">{f.email}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                            {f.created_at ? relativeTime(new Date(f.created_at * 1000).toISOString()) : ""}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed pl-9">{f.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
