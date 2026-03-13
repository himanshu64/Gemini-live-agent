"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

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
  const { uid, getToken } = useAuth();
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

  const xpPct = profile ? (profile.xp_for_next_level > 0 ? (profile.xp_into_level / profile.xp_for_next_level) * 100 : 100) : 0;

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <h1 className="text-xl font-bold text-foreground">Rewards</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={loadData} disabled={loadingData}>
            {loadingData ? "..." : "Refresh"}
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
              tab === t.key ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-5 mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 px-5 pb-5">
        {loadingData && !profile ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
          </div>
        ) : (
          <>
            {/* ===================== PROFILE TAB ===================== */}
            {tab === "profile" && profile && (
              <>
                {/* Level card */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl font-bold text-amber-400">
                        {profile.level}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-bold text-foreground">{profile.level_title}</p>
                        <p className="text-xs text-muted-foreground">{profile.xp.toLocaleString()} total XP</p>
                      </div>
                    </div>
                    <Progress value={xpPct} max={100}>
                      <ProgressLabel className="text-xs">Level {profile.level}</ProgressLabel>
                      <ProgressValue className="text-xs">{() => `${profile.xp_into_level} / ${profile.xp_for_next_level} XP`}</ProgressValue>
                    </Progress>
                  </CardContent>
                </Card>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: `${profile.streak_days}d`, label: "Streak", color: "text-orange-400", sub: `Best: ${profile.longest_streak}d` },
                    { value: profile.total_sessions, label: "Sessions", color: "text-blue-400", sub: "" },
                    { value: `${profile.total_minutes}m`, label: "Total Time", color: "text-green-400", sub: "" },
                    { value: profile.loyalty_points, label: "Points", color: "text-purple-400", sub: "Loyalty" },
                  ].map((s) => (
                    <Card key={s.label} className="bg-card/50 backdrop-blur-sm">
                      <CardContent className="pt-3 pb-3">
                        <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                        {s.sub && <p className="text-[9px] text-muted-foreground/60 mt-0.5">{s.sub}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Badges summary */}
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold">Badges</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{profile.total_badges} / {profile.available_badges}</Badge>
                  </CardHeader>
                  <CardContent>
                    {profile.badges.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No badges yet. Keep using SightLine!</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile.badges.map((b) => (
                          <span key={b} className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs text-amber-400">
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setTab("badges")} className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      View all badges &rarr;
                    </button>
                  </CardContent>
                </Card>

                {/* Rewards claimed */}
                {profile.rewards_claimed.length > 0 && (
                  <Card className="bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Claimed Rewards</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-1.5">
                        {profile.rewards_claimed.map((r, i) => (
                          <div key={i} className="flex items-center justify-between text-sm py-1">
                            <span className="text-card-foreground">{r.reward_id}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(r.claimed_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ===================== BADGES TAB ===================== */}
            {tab === "badges" && profile && (
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold">All Badges</CardTitle>
                  <Badge variant="outline" className="text-[10px]">{profile.total_badges} earned</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(allBadges).map(([id, badge]) => {
                      const earned = profile.badges.includes(id);
                      return (
                        <div
                          key={id}
                          className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                            earned ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/20 opacity-50"
                          }`}
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                            earned ? "bg-amber-500/20" : "bg-muted"
                          }`}>
                            {BADGE_ICONS[badge.icon] || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${earned ? "text-card-foreground" : "text-muted-foreground"}`}>
                              {badge.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{badge.description}</p>
                          </div>
                          {earned && (
                            <Badge className="text-[9px] bg-amber-500/20 text-amber-400 shrink-0">Earned</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ===================== REWARDS TAB ===================== */}
            {tab === "rewards" && profile && (
              <>
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Your Loyalty Points</p>
                        <p className="text-3xl font-bold text-purple-400 tabular-nums">{profile.loyalty_points}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase">Earn 5 pts per session</p>
                        <p className="text-[10px] text-muted-foreground uppercase">+ streak bonuses</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Available Rewards</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      {rewards.map((r) => {
                        const canAfford = profile.loyalty_points >= r.cost;
                        return (
                          <div
                            key={r.id}
                            className={`flex items-center gap-3 rounded-xl border p-3 ${
                              canAfford ? "border-purple-500/30 bg-purple-500/5" : "border-border bg-muted/20"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-card-foreground">{r.name}</p>
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
                                    ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30"
                                    : "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                                }`}
                              >
                                {claiming === r.id ? "..." : "Claim"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ===================== LEADERBOARD TAB ===================== */}
            {tab === "leaderboard" && (
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                  {leaderboard.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {leaderboard.map((entry) => {
                        const isMe = entry.uid === uid;
                        return (
                          <div
                            key={entry.uid}
                            className={`flex items-center gap-3 rounded-xl border p-3 ${
                              isMe ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/30"
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
                                <p className={`text-sm font-medium ${isMe ? "text-amber-400" : "text-card-foreground"}`}>
                                  {isMe ? "You" : `User ${entry.uid.slice(0, 6)}...`}
                                </p>
                                <Badge variant="outline" className="text-[9px] h-4">{entry.level_title}</Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                Lv.{entry.level} &middot; {entry.total_sessions} sessions &middot; {entry.badge_count} badges
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold tabular-nums text-amber-400">{entry.xp.toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground">XP</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
