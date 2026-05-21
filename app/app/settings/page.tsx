"use client";

import LogoutButton from "@/app/components/layout/LogoutButton";
import UserAvatar from "@/app/components/common/UserAvatar";
import { getProfileCompletion } from "@/app/lib/profileCompletion";
import { fetchUser, updateUser } from "@/app/store/authSlice";
import { AppDispatch, RootState } from "@/app/store/store";
import { Check, Circle, Lock, Moon, Palette, Shield, ShieldOff, Sun, Unlock, UserRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";

type BlockedUser = {
  id: string;
  username?: string | null;
  first_name?: string;
  last_name?: string;
  profile?: {
    avatar?: string | null;
  };
};

export default function SettingsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [darkMode, setDarkMode] = useState(false);
  const [isPrivacySaving, setIsPrivacySaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isBlockedLoading, setIsBlockedLoading] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const profileCompletion = getProfileCompletion(user);
  const isPrivate = Boolean(user?.profile?.is_private);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("theme") || "light";
      setDarkMode(storedTheme === "dark");
    } catch {
      setDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    const nextDarkMode = !darkMode;
    const theme = nextDarkMode ? "dark" : "light";
    setDarkMode(nextDarkMode);
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Theme persistence is best-effort.
    }
  };

  const loadBlockedUsers = useCallback(async () => {
    setIsBlockedLoading(true);
    try {
      const response = await fetch("/api/auth/users/blocked", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to load blocked users");
      }
      setBlockedUsers(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error("Failed to load blocked users", error);
      setBlockedUsers([]);
    } finally {
      setIsBlockedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlockedUsers();
  }, [loadBlockedUsers]);

  const togglePrivacy = async () => {
    if (isPrivacySaving) return;

    setIsPrivacySaving(true);
    try {
      await dispatch(updateUser({ is_private: !isPrivate })).unwrap();
      await dispatch(fetchUser()).unwrap();
      toast.success(!isPrivate ? "Profile is now private" : "Profile is now public");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update privacy");
    } finally {
      setIsPrivacySaving(false);
    }
  };

  const unblockUser = async (blockedUserId: string) => {
    if (unblockingId) return;

    const previous = blockedUsers;
    setUnblockingId(blockedUserId);
    setBlockedUsers((current) => current.filter((blockedUser) => blockedUser.id !== blockedUserId));

    try {
      const response = await fetch(`/api/auth/users/${blockedUserId}/block`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to unblock user");
      }
      toast.success("User unblocked");
    } catch (error) {
      setBlockedUsers(previous);
      toast.error(error instanceof Error ? error.message : "Unable to unblock user");
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-10 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Account center</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Settings</h1>
            <p className="mt-2 text-sm font-medium text-base-content/70">Manage your account, privacy, safety, and app preferences.</p>
          </div>
          <div className="w-full sm:w-auto sm:min-w-36">
            <LogoutButton variant="danger" />
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-base-300 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar user={user} size={52} />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">
                  {user?.first_name || user?.username || "Account"}
                </p>
                <p className="truncate text-sm font-medium text-base-content/70">@{user?.username || "user"}</p>
                {user?.email && <p className="truncate text-xs font-medium text-base-content/70">{user.email}</p>}
              </div>
            </div>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-base-300 px-4 py-2.5 text-sm font-bold transition hover:bg-base-200"
            >
              <UserRound size={16} />
              Edit profile
            </Link>
          </div>

          <div className="divide-y divide-base-300">
            {profileCompletion.percent < 100 && (
              <div className="px-4 py-5 sm:px-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold">Profile completeness</p>
                    <p className="mt-1 text-sm font-medium text-base-content/70">
                      {profileCompletion.completedCount} of {profileCompletion.totalCount} done
                    </p>
                  </div>
                  <span className="rounded-full bg-base-200 px-3 py-1 text-sm font-semibold">
                    {profileCompletion.percent}%
                  </span>
                </div>
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-base-200">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${profileCompletion.percent}%` }}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {profileCompletion.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm font-medium text-base-content/75">
                      {item.completed ? (
                        <Check size={15} className="text-emerald-600" />
                      ) : (
                        <Circle size={15} className="text-base-content/30" />
                      )}
                      <span className={item.completed ? "line-through decoration-base-content/30" : ""}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center justify-between gap-4 px-4 py-5 text-left transition-colors hover:bg-base-200/60 sm:px-5"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Palette size={18} />
                </span>
                <div>
                  <p className="text-base font-bold">Theme</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-base-content/70">Switch between light and dark mode.</p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-2 rounded-full bg-base-200 px-3 py-2 text-sm font-medium">
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                {darkMode ? "Light" : "Dark"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void togglePrivacy()}
              disabled={isPrivacySaving}
              className="flex w-full items-center justify-between gap-4 px-4 py-5 text-left transition-colors hover:bg-base-200/60 disabled:cursor-wait disabled:opacity-60 sm:px-5"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                  <Shield size={18} />
                </span>
                <div>
                  <p className="text-base font-bold">Profile privacy</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-base-content/70">
                    Private profiles hide clips and details from people who do not follow you.
                  </p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-2 rounded-full bg-base-200 px-3 py-2 text-sm font-medium">
                {isPrivate ? <Lock size={16} /> : <Unlock size={16} />}
                {isPrivate ? "Private" : "Public"}
              </span>
            </button>

            <div className="px-4 py-5 sm:px-5">
              <div className="mb-3">
                <p className="text-base font-bold">Blocked users</p>
                <p className="mt-1 text-sm font-medium leading-6 text-base-content/70">
                  Blocked people cannot message, call, follow, or interact with you.
                </p>
              </div>
              {isBlockedLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-xl bg-base-200" />
                  ))}
                </div>
              ) : blockedUsers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-base-300 px-4 py-5 text-center text-sm font-medium text-base-content/65">
                  <ShieldOff className="mx-auto mb-2 text-base-content/35" size={24} />
                  No blocked users.
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map((blockedUser) => (
                    <div key={blockedUser.id} className="flex items-center justify-between gap-3 rounded-xl border border-base-300 px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar user={blockedUser} size={38} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {blockedUser.first_name || blockedUser.username || "User"}
                          </p>
                          <p className="truncate text-xs font-medium text-base-content/70">@{blockedUser.username || "user"}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void unblockUser(blockedUser.id)}
                        disabled={unblockingId === blockedUser.id}
                        className="shrink-0 rounded-xl border border-base-300 px-3 py-2 text-sm font-semibold transition hover:bg-base-200 disabled:cursor-wait disabled:opacity-60"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-rose-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-bold">Session</p>
              <p className="mt-1 text-sm font-medium leading-6 text-rose-800/80">
                Log out when you are done on this device, especially on shared computers.
              </p>
            </div>
            <div className="w-full sm:w-40">
              <LogoutButton variant="danger" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
