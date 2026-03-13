"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";
import Link from "next/link";

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

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-blue-500";

  return (
    <div className="w-full rounded-full bg-gray-800 h-4" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit} aria-label={`${formatTime(used)} of ${formatTime(limit)} used`}>
      <div className={`h-4 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { uid, getToken } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <p className="text-xl text-gray-400">Loading...</p>
      </main>
    );
  }

  if (status === "unauthenticated") return null;

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

  useEffect(() => {
    if (uid) fetchUsage();
  }, [uid, fetchUsage]);

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 min-h-[44px] flex items-center">
            Back to App
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 min-h-[44px]"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4">
        {/* Account Card */}
        <section className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
          <h2 className="text-lg font-semibold text-gray-200 mb-3">Account</h2>
          <div className="flex flex-col gap-2 text-gray-400">
            {session?.user?.image && (
              <div className="flex items-center gap-3 mb-2">
                <img src={session.user.image} alt="" className="w-10 h-10 rounded-full" />
                <div>
                  <p className="text-gray-200 font-medium">{session.user.name}</p>
                  <p className="text-sm">{session.user.email}</p>
                </div>
              </div>
            )}
            <p>User ID: <span className="text-gray-200 font-mono text-sm">{uid?.slice(0, 12)}...</span></p>
            <p>Status: <span className="text-gray-200">{session?.user?.email ? "Signed in" : "Guest"}</span></p>
            <p>Tier: <span className="text-gray-200 capitalize">{usage?.tier || "free"}</span></p>
          </div>
        </section>

        {/* Usage Card */}
        <section className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-200">Today&apos;s Usage</h2>
            <button
              onClick={fetchUsage}
              disabled={fetching}
              className="rounded-lg bg-gray-800 px-3 py-1 text-sm text-gray-400 hover:bg-gray-700 disabled:opacity-50"
            >
              {fetching ? "..." : "Refresh"}
            </button>
          </div>

          {error && <p className="text-red-400 mb-3">{error}</p>}

          {usage ? (
            <div className="flex flex-col gap-4">
              <UsageBar used={usage.today_seconds_used} limit={usage.today_seconds_limit} />
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-800 p-4 text-center">
                  <p className="text-2xl font-bold text-white">{formatTime(usage.today_seconds_used)}</p>
                  <p className="text-sm text-gray-400">Used today</p>
                </div>
                <div className="rounded-xl bg-gray-800 p-4 text-center">
                  <p className="text-2xl font-bold text-white">{usage.today_seconds_remaining >= 0 ? formatTime(usage.today_seconds_remaining) : "Unlimited"}</p>
                  <p className="text-sm text-gray-400">Remaining</p>
                </div>
              </div>
              <div className="rounded-xl bg-gray-800 p-4 text-center">
                <p className="text-2xl font-bold text-white">{usage.today_seconds_limit > 0 ? formatTime(usage.today_seconds_limit) : "Unlimited"}</p>
                <p className="text-sm text-gray-400">Daily limit ({usage.tier} tier)</p>
              </div>
            </div>
          ) : !error ? (
            <p className="text-gray-500">Loading usage data...</p>
          ) : null}
        </section>

        {/* Plan Details */}
        <section className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
          <h2 className="text-lg font-semibold text-gray-200 mb-3">Plan Details</h2>
          <div className="flex flex-col gap-2 text-gray-400">
            <p>Free tier: <span className="text-gray-200">30 minutes / day</span></p>
            <p>Resets: <span className="text-gray-200">Daily at midnight UTC</span></p>
            <p>Features: <span className="text-gray-200">All modes (Navigate, Read, Shop, Social)</span></p>
          </div>
        </section>
      </div>
    </main>
  );
}
