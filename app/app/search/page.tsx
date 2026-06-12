"use client";

import UserAvatar from "@/app/components/common/UserAvatar";
import type { Video } from "@/app/store/videoSlice";
import { Check, MessageCircle, Play, Search, UserPlus, Users, VideoIcon, X } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type SearchTab = "top" | "videos" | "people";

type SearchUser = {
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

const categories = ["All", "Comedy", "Music", "Dance", "Fashion", "Gaming", "Food", "Fitness", "Beauty", "Tech", "Film", "Sports", "Travel"];

function parseSkills(value?: string) {
  return String(value || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function personMatches(person: SearchUser, query: string, category: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCategory = category === "All" ? "" : category.toLowerCase();
  const searchableText = [
    person.username,
    person.first_name,
    person.last_name,
    person.profile?.bio,
    person.profile?.skill_tags,
  ].join(" ").toLowerCase();

  return (
    (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
    (!normalizedCategory || String(person.profile?.skill_tags || "").toLowerCase().includes(normalizedCategory))
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>("top");
  const [category, setCategory] = useState("All");
  const [videos, setVideos] = useState<Video[]>([]);
  const [people, setPeople] = useState<SearchUser[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [loadingFollowId, setLoadingFollowId] = useState<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
    setSubmittedQuery(initialQuery);
  }, [initialQuery]);

  const loadVideos = useCallback(async () => {
    setIsLoadingVideos(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "30",
        search: submittedQuery,
        feed: "latest",
      });

      if (category !== "All") {
        params.set("category", category);
      }

      const response = await fetch(`/api/video/fetch?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to search videos");
      }

      setVideos(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error("Failed to search videos", error);
      setVideos([]);
    } finally {
      setIsLoadingVideos(false);
    }
  }, [category, submittedQuery]);

  const loadPeople = useCallback(async () => {
    setIsLoadingPeople(true);
    try {
      const response = await fetch("/api/messages/users", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to search creators");
      }
      setPeople(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error("Failed to search creators", error);
      setPeople([]);
    } finally {
      setIsLoadingPeople(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadVideos();
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [loadVideos]);

  useEffect(() => {
    void loadPeople();
  }, [loadPeople]);

  const filteredPeople = useMemo(() => {
    return people.filter((person) => personMatches(person, submittedQuery, category));
  }, [category, people, submittedQuery]);

  const visibleVideos = activeTab === "top" ? videos.slice(0, 8) : videos;
  const visiblePeople = activeTab === "top" ? filteredPeople.slice(0, 6) : filteredPeople;
  const hasQuery = Boolean(submittedQuery.trim() || category !== "All");

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const nextQuery = query.trim();
    setSubmittedQuery(nextQuery);
    router.replace(nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}` : "/search");
  };

  const clearSearch = () => {
    setQuery("");
    setSubmittedQuery("");
    setCategory("All");
    router.replace("/search");
  };

  const followPerson = async (person: SearchUser) => {
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

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-12 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Search</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Find clips and creators</h1>
        </div>

        <form onSubmit={submitSearch} className="mb-4 flex items-center gap-2 rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
          <Search size={18} className="text-base-content/70" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search videos, creators, skills, or interests"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/40"
            autoFocus
          />
          {(query || submittedQuery || category !== "All") && (
            <button
              type="button"
              onClick={clearSearch}
              className="flex h-8 w-8 items-center justify-center rounded-full text-base-content/70 transition hover:bg-base-200 hover:text-base-content"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-content transition hover:bg-primary/90">
            Search
          </button>
        </form>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                category === item
                  ? "border-primary bg-primary text-primary-content"
                  : "border-base-300 bg-base-100 text-base-content/65 hover:bg-base-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mb-6 flex rounded-full border border-base-300 bg-base-100 p-1 shadow-sm">
          {[
            { id: "top" as const, label: "Top", icon: <Search size={15} /> },
            { id: "videos" as const, label: "Videos", icon: <VideoIcon size={15} /> },
            { id: "people" as const, label: "Creators", icon: <Users size={15} /> },
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

        {(activeTab === "top" || activeTab === "videos") && (
          <section className="mb-9">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Videos</h2>
              {activeTab === "top" && videos.length > visibleVideos.length && (
                <button type="button" onClick={() => setActiveTab("videos")} className="text-sm font-bold text-primary">
                  See all
                </button>
              )}
            </div>
            {isLoadingVideos ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="aspect-[9/16] animate-pulse rounded-2xl bg-base-200" />
                ))}
              </div>
            ) : visibleVideos.length === 0 ? (
              <EmptyState text={hasQuery ? "No videos found for this search." : "No videos found yet."} />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visibleVideos.map((video) => (
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
                        <span>{video.skill_category || "general"}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {(activeTab === "top" || activeTab === "people") && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Creators</h2>
              {activeTab === "top" && filteredPeople.length > visiblePeople.length && (
                <button type="button" onClick={() => setActiveTab("people")} className="text-sm font-bold text-primary">
                  See all
                </button>
              )}
            </div>
            {isLoadingPeople ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-36 animate-pulse rounded-2xl bg-base-200" />
                ))}
              </div>
            ) : visiblePeople.length === 0 ? (
              <EmptyState text={hasQuery ? "No creators found for this search." : "No creators found yet."} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visiblePeople.map((person) => {
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
                          <UserAvatar user={person} size={52} showPresence isOnline={person.profile?.availability_status === "available"} />
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-10 text-center text-sm font-medium text-base-content/70">
      {text}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="min-h-[100dvh] bg-base-100" />}>
      <SearchPageContent />
    </Suspense>
  );
}
