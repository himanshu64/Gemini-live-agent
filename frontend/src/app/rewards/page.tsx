"use client";
import { useCallback, useEffect, useState } from "react";
import { usePageAnimations } from "@/hooks/usePageAnimations";
import { useAuthContext } from "@/lib/auth/auth-provider";
import { API_URL } from "@/lib/constants";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  xp: number;
  level: number;
  level_title: string;
  xp_into_level: number;
  xp_for_next_level: number;
  streak_days: number;
  longest_streak: number;
  total_sessions: number;
  total_minutes: number;
  badges: string[];
  total_badges: number;
  available_badges: number;
  loyalty_points: number;
  rewards_claimed: { reward_id: string; claimed_at: string }[];
}

interface BadgeInfo {
  name: string;
  description: string;
  icon: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: string;
}

interface LeaderboardEntry {
  rank: number;
  uid: string;
  xp: number;
  level: number;
  level_title: string;
  streak_days: number;
  total_sessions: number;
  badge_count: number;
}

type Tab = "profile" | "badges" | "rewards" | "leaderboard";

// ---------------------------------------------------------------------------
// Badge icon map (text-based for simplicity)
// ---------------------------------------------------------------------------

const BADGE_ICONS: Record<string, string> = {
  footprints: "👣", sunrise: "🌅", moon: "🌙", compass: "🧭",
  book: "📖", cart: "🛒", people: "👥", star: "⭐",
  fire: "🔥", flame: "🔥", trophy: "🏆", bolt: "⚡",
  shield: "🛡️", check: "✓", camera: "📸", medal: "🏅",
  heart: "❤️",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RewardsPage() {
  const pageRef = usePageAnimations();
  const { user, getToken } = useAuthContext();
  const uid = user?.id;
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allBadges, setAllBadges] = useState<Record<string, BadgeInfo>>({});
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState("");

  const apiFetch = useCallback(async <T,>(path: string, options?: RequestInit): Promise<T | null> => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options?.headers },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      return null;
    }
  }, [getToken]);

  const loadData = useCallback(async () => {
    if (!uid) return;
    setLoadingData(true);
    setError("");

    // Always load profile
    const profileData = await apiFetch<Profile>("/api/gamification/profile");
    if (profileData) setProfile(profileData);

    switch (tab) {
      case "badges": {
        const data = await apiFetch<{ badges: Record<string, BadgeInfo> }>("/api/gamification/badges");
        if (data) setAllBadges(data.badges);
        break;
      }
      case "rewards": {
        const data = await apiFetch<{ rewards: Reward[] }>("/api/gamification/rewards");
        if (data) setRewards(data.rewards);
        break;
      }
      case "leaderboard": {
        const data = await apiFetch<{ leaderboard: LeaderboardEntry[] }>("/api/gamification/leaderboard?limit=20");
        if (data) setLeaderboard(data.leaderboard);
        break;
      }
    }
    setLoadingData(false);
  }, [uid, tab, apiFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleClaim = useCallback(async (rewardId: string) => {
    setClaiming(rewardId);
    const result = await apiFetch<{ claimed: string; remaining_points: number }>("/api/gamification/claim-reward", {
      method: "POST",
      body: JSON.stringify({ reward_id: rewardId }),
    });
    if (result) {
      setProfile((p) => p ? { ...p, loyalty_points: result.remaining_points } : p);
    }
    setClaiming(null);
    loadData();
  }, [apiFetch, loadData]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "badges", label: "Badges" },
    { key: "rewards", label: "Rewards" },
    { key: "leaderboard", label: "Leaderboard" },
  ];

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/live", label: "Live" },
    { href: "/", label: "Home" },
  ];

  const xpPct = profile ? (profile.xp_for_next_level > 0 ? (profile.xp_into_level / profile.xp_for_next_level) * 100 : 100) : 0;

  return (
    <main ref={pageRef} className="flex min-h-dvh flex-col bg-background">
      {/* ── Header ── */}
      <header
        data-gsap="page-header"
        className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50"
      >
        <div className="max-w-6xl mx-auto w-full px-5 py-3 flex items-center justify-between gap-4">
          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 text-sm font-bold text-primary">
              S
            </div>
            <h1 className="text-base font-semibold text-foreground">Rewards</h1>
          </div>

          {/* Desktop pill tabs inline */}
          <div className="hidden md:flex items-center gap-1" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  tab === t.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navLinks.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile pill tabs row */}
        <div className="md:hidden flex gap-1 px-5 pb-3 overflow-x-auto" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                tab === t.key ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Error ── */}
      {error && (
        <div className="max-w-6xl mx-auto w-full px-5 pt-4">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-red-300" role="alert">
            {error}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div data-gsap="page-content" className="max-w-6xl mx-auto w-full px-5 py-6 flex flex-col gap-4">
        {loadingData && !profile ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-primary" />
          </div>
        ) : (
          <>
            {/* ===================== PROFILE TAB ===================== */}
            {tab === "profile" && profile && (
              <>
                {/* Level card */}
                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl font-bold text-amber-400">
                      {profile.level}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-foreground">{profile.level_title}</p>
                      <p className="text-xs text-muted-foreground">{profile.xp.toLocaleString()} total XP</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Level {profile.level}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{profile.xp_into_level} / {profile.xp_for_next_level} XP</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${xpPct}%` }} />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: `${profile.streak_days}d`, label: "Streak", color: "text-orange-400", sub: `Best: ${profile.longest_streak}d` },
                    { value: profile.total_sessions, label: "Sessions", color: "text-blue-400", sub: "" },
                    { value: `${profile.total_minutes}m`, label: "Total Time", color: "text-green-400", sub: "" },
                    { value: profile.loyalty_points, label: "Points", color: "text-purple-400", sub: "Loyalty" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                      <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      {s.sub && <p className="text-[9px] text-muted-foreground/60 mt-0.5">{s.sub}</p>}
                    </div>
                  ))}
                </div>

                {/* Badges summary */}
                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Badges</h2>
                    <span className="rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 px-2.5 py-0.5 text-[10px] font-medium">
                      {profile.total_badges} / {profile.available_badges}
                    </span>
                  </div>
                  {profile.badges.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No badges yet. Keep using SightLine!</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.badges.map((b) => (
                        <span key={b} className="rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 px-2.5 py-0.5 text-[10px] font-medium">
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setTab("badges")} className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    View all badges &rarr;
                  </button>
                </div>

                {/* Rewards claimed */}
                {profile.rewards_claimed.length > 0 && (
                  <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Claimed Rewards</h2>
                    <div className="flex flex-col gap-1.5">
                      {profile.rewards_claimed.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1">
                          <span className="text-foreground">{r.reward_id}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.claimed_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ===================== BADGES TAB ===================== */}
            {tab === "badges" && profile && (
              <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">All Badges</h2>
                  <span className="rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 px-2.5 py-0.5 text-[10px] font-medium">
                    {profile.total_badges} earned
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(allBadges).map(([id, badge]) => {
                    const earned = profile.badges.includes(id);
                    return (
                      <div
                        key={id}
                        className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                          earned ? "bg-amber-500/5 ring-1 ring-amber-500/30" : "bg-muted/20 ring-1 ring-border/30 opacity-50"
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                          earned ? "bg-amber-500/20" : "bg-muted"
                        }`}>
                          {BADGE_ICONS[badge.icon] || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${earned ? "text-foreground" : "text-muted-foreground"}`}>
                            {badge.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{badge.description}</p>
                        </div>
                        {earned && (
                          <span className="rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 px-2.5 py-0.5 text-[10px] font-medium shrink-0">
                            Earned
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===================== REWARDS TAB ===================== */}
            {tab === "rewards" && profile && (
              <>
                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Your Loyalty Points</p>
                      <p className="text-3xl font-bold text-purple-400 tabular-nums">{profile.loyalty_points}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Earn 5 pts per session</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">+ streak bonuses</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">Available Rewards</h2>
                  <div className="flex flex-col gap-3">
                    {rewards.map((r) => {
                      const canAfford = profile.loyalty_points >= r.cost;
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center gap-3 rounded-xl p-3 ring-1 ${
                            canAfford ? "ring-purple-500/30 bg-purple-500/5" : "ring-border/30 bg-muted/20"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{r.name}</p>
                            <p className="text-[11px] text-muted-foreground">{r.description}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs font-medium tabular-nums ${canAfford ? "text-purple-400" : "text-muted-foreground"}`}>
                              {r.cost} pts
                            </span>
                            <button
                              onClick={() => handleClaim(r.id)}
                              disabled={!canAfford || claiming === r.id}
                              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                canAfford
                                  ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 ring-1 ring-purple-500/30"
                                  : "bg-muted text-muted-foreground cursor-not-allowed ring-1 ring-border/30"
                              }`}
                            >
                              {claiming === r.id ? "..." : "Claim"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ===================== LEADERBOARD TAB ===================== */}
            {tab === "leaderboard" && (
              <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">Leaderboard</h2>
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {leaderboard.map((entry) => {
                      const isMe = entry.uid === uid;
                      return (
                        <div
                          key={entry.uid}
                          className={`flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors ${
                            isMe ? "bg-amber-500/5 ring-1 ring-amber-500/30" : "bg-muted/30 ring-1 ring-border/30"
                          }`}
                        >
                          {/* Rank */}
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            entry.rank === 1 ? "bg-amber-500/30 text-amber-400" :
                            entry.rank === 2 ? "bg-gray-400/20 text-gray-300" :
                            entry.rank === 3 ? "bg-amber-700/20 text-amber-600" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {entry.rank}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${isMe ? "text-amber-400" : "text-foreground"}`}>
                                {isMe ? "You" : `User ${entry.uid.slice(0, 6)}...`}
                              </p>
                              <span className="rounded-full bg-muted/50 ring-1 ring-border/30 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                                {entry.level_title}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Lv.{entry.level} &middot; {entry.total_sessions} sessions &middot; {entry.badge_count} badges
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold tabular-nums text-amber-400">{entry.xp.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">XP</p>
                          </div>
                        </div>
                      );
                    })}
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
