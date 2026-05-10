"use client";

import LogoutButton from "@/app/components/layout/LogoutButton";
import UserAvatar from "@/app/components/common/UserAvatar";
import { getProfileCompletion } from "@/app/lib/profileCompletion";
import { fetchUser, updateUser } from "@/app/store/authSlice";
import { AppDispatch, RootState } from "@/app/store/store";
import { Check, Circle, Lock, Moon, ShieldOff, Sun, Unlock } from "lucide-react";
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
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-2 text-sm text-base-content/60">Manage your account and app preferences.</p>
        </div>

        <section className="rounded-2xl border border-base-300 bg-base-100">
          <div className="flex items-center gap-3 border-b border-base-300 px-4 py-4">
            <UserAvatar user={user} size={44} />
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {user?.first_name || user?.username || "Account"}
              </p>
              <p className="truncate text-sm text-base-content/55">@{user?.username || "user"}</p>
            </div>
          </div>

          <div className="divide-y divide-base-300">
            {profileCompletion.percent < 100 && (
              <div className="px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Profile completeness</p>
                    <p className="mt-1 text-sm text-base-content/55">
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
                    <div key={item.id} className="flex items-center gap-2 text-sm text-base-content/65">
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
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-base-200/60"
            >
              <div>
                <p className="font-medium">Theme</p>
                <p className="mt-1 text-sm text-base-content/55">Switch between light and dark mode.</p>
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
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-base-200/60 disabled:cursor-wait disabled:opacity-60"
            >
              <div>
                <p className="font-medium">Profile privacy</p>
                <p className="mt-1 text-sm text-base-content/55">
                  Private profiles hide clips and details from people who do not follow you.
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-2 rounded-full bg-base-200 px-3 py-2 text-sm font-medium">
                {isPrivate ? <Lock size={16} /> : <Unlock size={16} />}
                {isPrivate ? "Private" : "Public"}
              </span>
            </button>

            <div className="px-4 py-4">
              <div className="mb-3">
                <p className="font-medium">Blocked users</p>
                <p className="mt-1 text-sm text-base-content/55">
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
                <div className="rounded-xl border border-dashed border-base-300 px-4 py-5 text-center text-sm text-base-content/55">
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
                          <p className="truncate text-xs text-base-content/50">@{blockedUser.username || "user"}</p>
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

            <div className="px-4 py-4">
              <div className="mb-3">
                <p className="font-medium">Session</p>
                <p className="mt-1 text-sm text-base-content/55">Log out only when you are done on this device.</p>
              </div>
              <div className="max-w-xs rounded-lg border border-base-300">
                <LogoutButton />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
