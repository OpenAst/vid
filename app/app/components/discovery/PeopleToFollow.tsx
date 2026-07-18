"use client";

import UserAvatar from "@/app/components/common/UserAvatar";
import { UserPlus, X } from "lucide-react";
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
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const loadPeople = useCallback(async () => {
    setIsLoadingPeople(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/messages/users?random=1", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to load people");
      }

      let nextPeople = Array.isArray(data.results) ? data.results : [];
      if (nextPeople.length === 0) {
        const fallbackResponse = await fetch("/api/messages/users?random=1", { cache: "no-store" });
        const fallbackData = await fallbackResponse.json();
        if (fallbackResponse.ok) {
          nextPeople = Array.isArray(fallbackData.results) ? fallbackData.results : [];
        }
      }

      setPeople(nextPeople.slice(0, 10));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load people");
      setPeople([]);
    } finally {
      setIsLoadingPeople(false);
    }
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

  const renderPerson = (person: DiscoverUser) => {
    const name = person.first_name || person.username || "Creator";
    const skills = parseSkills(person.profile?.skill_tags);
    const isActive = person.profile?.availability_status === "available";

    return (
      <div key={person.id} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-primary/5">
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
          {skills.length > 0 && <p className="mt-1 truncate text-[11px] text-base-content/50">{skills.join(" · ")}</p>}
        </button>

        <button
          type="button"
          onClick={() => void followUser(person)}
          disabled={Boolean(person.is_following) || loadingUserId === person.id}
          aria-label={`${person.is_following ? "Following" : "Follow"} ${name}`}
          className={`shrink-0 min-w-[88px] rounded-full border px-3 py-1.5 text-center text-xs font-semibold shadow-sm transition ${
            person.is_following
              ? "border-primary/35 bg-primary/10 text-primary"
              : "border-primary bg-primary text-white hover:bg-primary/90"
          } ${loadingUserId === person.id ? "cursor-wait opacity-80" : ""}`}
        >
          {loadingUserId === person.id ? "..." : person.is_following ? "Following" : "Follow"}
        </button>
      </div>
    );
  };

  const renderPanelBody = () => {
    if (isLoadingPeople) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-2xl p-2">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-base-300" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-28 animate-pulse rounded-full bg-base-300" />
                <div className="h-2.5 w-20 animate-pulse rounded-full bg-base-300/80" />
              </div>
              <div className="h-7 w-16 animate-pulse rounded-full bg-base-300" />
            </div>
          ))}
        </div>
      );
    }

    if (people.length > 0) {
      return <div className="space-y-2">{people.map(renderPerson)}</div>;
    }

    return (
      <div className="rounded-2xl border border-base-300 bg-base-100/70 p-4 text-sm text-base-content/65">
        <p className="font-semibold text-base-content">
          {loadError ? "Suggestions unavailable" : "No suggestions right now"}
        </p>
        <p className="mt-1 text-xs leading-5">
          {loadError || "Explore creators to find more people to follow."}
        </p>
      </div>
    );
  };

  return (
    <>
      {(people.length > 0 || isLoadingPeople) && (
        <button
          type="button"
          onClick={() => setIsMobileSheetOpen(true)}
          className="fixed right-3 top-[calc(var(--app-header-height)+12px)] z-30 flex items-center gap-2 rounded-full border border-white/60 bg-base-100/90 px-3 py-2 text-xs font-bold text-primary shadow-lg shadow-primary/10 backdrop-blur-xl transition hover:-translate-y-0.5 xl:hidden"
        >
          <UserPlus size={15} />
          <span>People</span>
          <span className="h-2 w-2 rounded-full bg-primary" />
        </button>
      )}

      {isMobileSheetOpen && (
        <>
          <button
            type="button"
            aria-label="Close people to follow"
            className="fixed inset-0 z-40 bg-black/25 xl:hidden"
            onClick={() => setIsMobileSheetOpen(false)}
          />
          <section className="fixed inset-x-4 bottom-[calc(var(--safe-area-bottom)+14px)] z-50 max-h-[56dvh] overflow-hidden rounded-[1.5rem] border border-white/60 bg-base-100/95 p-3 shadow-2xl shadow-primary/15 backdrop-blur-2xl xl:hidden">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">People to follow</h2>
                <p className="text-[11px] text-base-content/55">Find creators you may like.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-base-content/60 transition hover:text-primary"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[38dvh] overflow-y-auto pr-1">
              {isLoadingPeople ? renderPanelBody() : people.slice(0, 8).map(renderPerson)}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMobileSheetOpen(false);
                router.push("/discover");
              }}
              className="mt-2 w-full rounded-full border border-primary/25 px-4 py-2 text-xs font-bold text-primary transition hover:border-primary/50 hover:bg-primary/5"
            >
              See more creators
            </button>
          </section>
        </>
      )}

      <section className="fixed right-4 top-[calc(var(--app-header-height)+18px)] z-20 hidden w-72 rounded-[1.75rem] border border-white/60 bg-base-100/80 p-3 shadow-2xl shadow-primary/10 ring-1 ring-primary/5 backdrop-blur-2xl xl:block">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">People to follow</h2>
          <button
            type="button"
            onClick={() => router.push("/discover")}
            className="text-xs font-medium text-primary hover:underline"
          >
            See all
          </button>
        </div>

        {renderPanelBody()}
      </section>
    </>
  );
}
