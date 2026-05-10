"use client";

import UserAvatar from "@/app/components/common/UserAvatar";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type DiscoverUser = {
  id: string;
  username?: string | null;
  first_name?: string;
  last_name?: string;
  is_following?: boolean;
  follower_count?: number;
  profile?: {
    avatar?: string | null;
    skill_tags?: string;
    availability_status?: string;
  };
};

function parseSkills(value?: string) {
  return String(value || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 2);
}

export default function PeopleToFollow() {
  const router = useRouter();
  const [people, setPeople] = useState<DiscoverUser[]>([]);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const loadPeople = useCallback(async () => {
    const response = await fetch("/api/messages/users", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return;

    setPeople((Array.isArray(data.results) ? data.results : []).slice(0, 8));
  }, []);

  useEffect(() => {
    void loadPeople();
  }, [loadPeople]);

  const followUser = async (person: DiscoverUser) => {
    if (person.is_following || loadingUserId) {
      return;
    }

    setLoadingUserId(person.id);
    try {
      const response = await fetch(`/api/auth/follow/${person.id}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to follow");
      }

      setPeople((current) =>
        current.map((item) =>
          item.id === person.id
            ? { ...item, is_following: true, follower_count: Number(data.followers ?? item.follower_count ?? 0) }
            : item
        )
      );
      toast.success("Following");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to follow");
    } finally {
      setLoadingUserId(null);
    }
  };

  if (people.length === 0) {
    return null;
  }

  return (
    <section className="fixed right-4 top-[calc(var(--app-header-height)+18px)] z-20 hidden w-72 rounded-2xl border border-base-300 bg-base-100/95 p-3 shadow-xl backdrop-blur xl:block">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">People to follow</h2>
        <button
          type="button"
          onClick={() => router.push("/messages")}
          className="text-xs font-medium text-primary hover:underline"
        >
          See all
        </button>
      </div>

      <div className="space-y-2">
        {people.map((person) => {
          const name = person.first_name || person.username || "Creator";
          const skills = parseSkills(person.profile?.skill_tags);
          const isActive = person.profile?.availability_status === "available";

          return (
            <div key={person.id} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-base-200/70">
              <button
                type="button"
                onClick={() => person.username && router.push(`/profile/${person.username}`)}
                className="shrink-0"
                aria-label={`Open ${name}'s profile`}
              >
                <UserAvatar user={person} size={40} showPresence isOnline={isActive} alt="" />
              </button>

              <button
                type="button"
                onClick={() => person.username && router.push(`/profile/${person.username}`)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-base-content/55">@{person.username || "creator"}</p>
                {skills.length > 0 && (
                  <p className="mt-1 truncate text-[11px] text-base-content/50">{skills.join(" · ")}</p>
                )}
              </button>

              <button
                type="button"
                onClick={() => void followUser(person)}
                disabled={Boolean(person.is_following) || loadingUserId === person.id}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  person.is_following
                    ? "bg-base-200 text-base-content/45"
                    : "bg-primary text-primary-content hover:opacity-90"
                }`}
              >
                {loadingUserId === person.id ? "..." : person.is_following ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
