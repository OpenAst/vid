"use client";

import UserAvatar from "@/app/components/common/UserAvatar";
import { RootState } from "@/app/store/store";
import type { Video } from "@/app/store/videoSlice";
import { Check, MessageCircle, Play, Search, UserPlus, Users, VideoIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

type DiscoverTab = "videos" | "people";

type DiscoverUser = {
  id: string;
  username?: string | null;
  first_name?: string;
  last_name?: string;
  is_following?: boolean;
  follower_count?: number;
  profile?: {
    avatar?: string | null;
    bio?: string | null;
    skill_tags?: string;
    availability_status?: string;
  };
};

const categories = ["All", "Comedy", "Music", "Dance", "Fashion", "Gaming", "Food", "Fitness", "Beauty", "Tech"];

function parseSkills(value?: string) {
  return String(value || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function matchesPerson(person: DiscoverUser, query: string, category: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCategory = category === "All" ? "" : category.toLowerCase();
  const text = [
    person.username,
    person.first_name,
    person.last_name,
    person.profile?.bio,
    person.profile?.skill_tags,
  ].join(" ").toLowerCase();

  const queryMatches = !normalizedQuery || text.includes(normalizedQuery);
  const categoryMatches = !normalizedCategory || String(person.profile?.skill_tags || "").toLowerCase().includes(normalizedCategory);
  return queryMatches && categoryMatches;
}

export default function DiscoverPage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapped } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState<DiscoverTab>("videos");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [videos, setVideos] = useState<Video[]>([]);
  const [people, setPeople] = useState<DiscoverUser[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [loadingFollowId, setLoadingFollowId] = useState<string | null>(null);

  useEffect(() => {
    if (isBootstrapped && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isBootstrapped, router]);

  const loadVideos = useCallback(async () => {
    setIsLoadingVideos(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "24",
        search: query,
        feed: "latest",
      });

      if (category !== "All") {
        params.set("category", category);
      }

      const response = await fetch(`/api/video/fetch?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to load videos");
      }

      setVideos(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error("Failed to load discover videos", error);
      setVideos([]);
    } finally {
      setIsLoadingVideos(false);
    }
  }, [category, query]);

  const loadPeople = useCallback(async () => {
    setIsLoadingPeople(true);
    try {
      const response = await fetch("/api/messages/users", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load people");
      }
      setPeople(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error("Failed to load discover people", error);
      setPeople([]);
    } finally {
      setIsLoadingPeople(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timeoutId = window.setTimeout(() => {
      void loadVideos();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [isAuthenticated, loadVideos]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadPeople();
    }
  }, [isAuthenticated, loadPeople]);

  const filteredPeople = useMemo(() => {
    return people.filter((person) => matchesPerson(person, query, category));
  }, [category, people, query]);

  const followPerson = async (person: DiscoverUser) => {
    if (person.is_following || loadingFollowId) return;

    setLoadingFollowId(person.id);
    setPeople((current) =>
      current.map((item) => item.id === person.id ? { ...item, is_following: true } : item)
    );

    try {
      const response = await fetch(`/api/auth/follow/${person.id}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to follow");
      }
      toast.success("Following");
    } catch (error) {
      setPeople((current) =>
        current.map((item) => item.id === person.id ? { ...item, is_following: false } : item)
      );
      toast.error(error instanceof Error ? error.message : "Unable to follow");
    } finally {
      setLoadingFollowId(null);
    }
  };

  if (!isBootstrapped || !isAuthenticated) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-base-100">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-base-300" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-10 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Discover</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Find creators and clips</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/70">
              Search videos, people, and skill tags from one place.
            </p>
          </div>

          <div className="flex rounded-full border border-base-300 bg-base-100 p-1 shadow-sm">
            {[
              { id: "videos" as const, label: "Videos", icon: <VideoIcon size={15} /> },
              { id: "people" as const, label: "People", icon: <Users size={15} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id ? "bg-base-content text-base-100" : "text-base-content/70 hover:bg-base-200"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="mb-3">
            <p className="text-sm font-bold text-base-content">Search discovery</p>
            <p className="mt-1 text-xs font-medium text-base-content/70">Filter clips and creators by topic, username, title, or skill.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
            <Search size={18} className="text-base-content/70" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search username, title, skills, or interests"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-base-content/45"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  category === item
                    ? "border-primary bg-primary text-primary-content"
                    : "border-base-300 bg-base-100 text-base-content/70 hover:bg-base-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "videos" ? (
          <section>
            {isLoadingVideos ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="aspect-[9/16] animate-pulse rounded-2xl bg-base-200" />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="rounded-2xl border border-base-300 bg-base-100 p-10 text-center text-sm font-medium text-base-content/70">
                No videos found. Try another search or category.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {videos.map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => router.push(`/video/${video.id}`)}
                    className="group overflow-hidden rounded-2xl border border-base-300 bg-base-100 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative aspect-[9/16] bg-base-200">
                      {video.thumbnail_url ? (
                        <Image
                          src={video.thumbnail_url}
                          alt={video.title}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          className="object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <video src={video.file_url} className="h-full w-full object-cover" muted preload="metadata" />
                      )}
                      <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
                        <Play size={15} fill="currentColor" />
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 text-sm font-semibold">{video.title || "Untitled clip"}</p>
                      <p className="mt-1 truncate text-xs font-medium text-base-content/70">@{video.uploader?.username || "creator"}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-base-content/70">
                        <span>{video.likes || 0} likes</span>
                        <span>{video.timestamp}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            {isLoadingPeople ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="h-36 animate-pulse rounded-2xl bg-base-200" />
                ))}
              </div>
            ) : filteredPeople.length === 0 ? (
              <div className="rounded-2xl border border-base-300 bg-base-100 p-10 text-center text-sm font-medium text-base-content/70">
                No creators found. Try another search or category.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPeople.map((person) => {
                  const name = person.first_name || person.username || "Creator";
                  const skills = parseSkills(person.profile?.skill_tags);
                  return (
                    <div key={person.id} className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => person.username && router.push(`/profile/${person.username}`)}
                          className="shrink-0"
                          aria-label={`Open ${name}'s profile`}
                        >
                          <UserAvatar
                            user={person}
                            size={52}
                            showPresence isOnline={person.profile?.availability_status === "available"}
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => person.username && router.push(`/profile/${person.username}`)}
                            className="block max-w-full text-left"
                          >
                            <p className="truncate font-semibold">{name}</p>
                            <p className="truncate text-sm font-medium text-base-content/70">@{person.username || "creator"}</p>
                          </button>
                          {skills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {skills.map((skill) => (
                                <span key={skill} className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {person.profile?.bio && (
                        <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-base-content/70">{person.profile.bio}</p>
                      )}

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void followPerson(person)}
                          disabled={Boolean(person.is_following) || loadingFollowId === person.id}
                          aria-label={`${person.is_following ? "Following" : "Follow"} ${name}`}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            person.is_following
                              ? "bg-base-200 text-base-content/70 ring-1 ring-base-300"
                              : "bg-primary text-primary-content hover:bg-primary/90"
                          } ${loadingFollowId === person.id ? "opacity-60 cursor-wait" : ""}`}
                        >
                          {person.is_following ? <Check size={15} /> : <UserPlus size={15} />}
                          {loadingFollowId === person.id ? "..." : person.is_following ? "Following" : "Follow"}
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/messages?user=${person.id}`)}
                          className="flex items-center justify-center rounded-xl border border-base-300 px-3 py-2 text-sm font-semibold transition hover:bg-base-200"
                          aria-label={`Message ${name}`}
                        >
                          <MessageCircle size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
