"use client";

import { RootState } from "@/app/store/store";
import type { Video } from "@/app/store/videoSlice";
import { Bookmark, Folder, FolderPlus, Play, Plus, Trash2, VideoIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

type SavedCollection = {
  id: string;
  name: string;
  count: number;
  created_at: string;
};

export default function SavedPage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapped } = useSelector((state: RootState) => state.auth);
  const [videos, setVideos] = useState<Video[]>([]);
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState("all");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (isBootstrapped && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isBootstrapped, router]);

  const loadCollections = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch("/api/video/collections", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to load collections");
      }
      setCollections(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error("Failed to load saved collections", error);
      setCollections([]);
    }
  }, [isAuthenticated]);

  const loadSavedVideos = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const url = activeCollectionId === "all"
        ? "/api/video/saved?limit=48"
        : `/api/video/collections/${activeCollectionId}`;
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to load saved videos");
      }
      setVideos(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error("Failed to load saved videos", error);
      toast.error(error instanceof Error ? error.message : "Unable to load saved videos");
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeCollectionId, isAuthenticated]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    void loadSavedVideos();
  }, [loadSavedVideos]);

  const createCollection = async () => {
    const name = newCollectionName.trim();
    if (!name || isCreatingCollection) return;

    setIsCreatingCollection(true);
    try {
      const response = await fetch("/api/video/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to create collection");
      }
      setCollections((current) => [data, ...current.filter((collection) => collection.id !== data.id)]);
      setActiveCollectionId(data.id);
      setNewCollectionName("");
      toast.success("Collection created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create collection");
    } finally {
      setIsCreatingCollection(false);
    }
  };

  const addToCollection = async (videoId: string, collectionId: string) => {
    if (!collectionId) return;

    try {
      const response = await fetch(`/api/video/collections/${collectionId}/items/${videoId}`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to add to collection");
      }
      await loadCollections();
      toast.success("Added to collection");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add to collection");
    }
  };

  const removeSavedVideo = async (videoId: string) => {
    if (removingId) return;

    const previousVideos = videos;
    setRemovingId(videoId);
    setVideos((current) => current.filter((video) => video.id !== videoId));

    try {
      const response = await fetch(
        activeCollectionId === "all"
          ? `/api/video/${videoId}/save`
          : `/api/video/collections/${activeCollectionId}/items/${videoId}`,
        { method: "DELETE" }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to remove saved video");
      }
      await loadCollections();
      toast.success(activeCollectionId === "all" ? "Removed from saved" : "Removed from collection");
    } catch (error) {
      setVideos(previousVideos);
      toast.error(error instanceof Error ? error.message : "Unable to remove saved video");
    } finally {
      setRemovingId(null);
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
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
              <Bookmark size={16} fill="currentColor" />
              Saved
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Your saved clips</h1>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveCollectionId("all")}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                activeCollectionId === "all" ? "bg-primary text-primary-content" : "bg-base-200 text-base-content hover:bg-base-300"
              }`}
            >
              <Bookmark size={15} />
              All saved
            </button>
            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => setActiveCollectionId(collection.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  activeCollectionId === collection.id ? "bg-primary text-primary-content" : "bg-base-200 text-base-content hover:bg-base-300"
                }`}
              >
                <Folder size={15} />
                {collection.name}
                <span className="rounded-full bg-black/10 px-1.5 text-xs">{collection.count}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createCollection();
                }
              }}
              placeholder="New collection"
              className="min-w-0 flex-1 rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-44"
            />
            <button
              type="button"
              onClick={() => void createCollection()}
              disabled={!newCollectionName.trim() || isCreatingCollection}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-content transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              <FolderPlus size={16} />
              Add
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="aspect-[9/16] animate-pulse rounded-2xl bg-base-200" />
            ))}
          </div>
        )}

        {!isLoading && videos.length === 0 && (
          <div className="flex min-h-[48vh] items-center justify-center rounded-2xl border border-dashed border-base-300 px-6 text-center">
            <div>
              <VideoIcon className="mx-auto mb-3 text-base-content/35" size={38} />
              <p className="font-semibold">No saved clips yet</p>
              <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-base-content/70">
                {activeCollectionId === "all"
                  ? "Save videos from the feed and they will stay here for later."
                  : "Add saved clips to this collection from the All saved view."}
              </p>
              <button type="button" onClick={() => router.push("/")} className="btn btn-primary btn-sm mt-5">
                Browse feed
              </button>
            </div>
          </div>
        )}

        {!isLoading && videos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {videos.map((video) => (
              <article key={video.id} className="group overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
                <button
                  type="button"
                  onClick={() => router.push(`/video/${video.id}`)}
                  className="relative block aspect-[9/16] w-full overflow-hidden bg-black text-left"
                >
                  {video.thumbnail_url ? (
                    <Image src={video.thumbnail_url} alt="" fill sizes="(min-width: 1280px) 18vw, (min-width: 768px) 25vw, 50vw" className="object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <video src={video.file_url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                    <Play size={12} fill="currentColor" />
                    {video.views || 0}
                  </span>
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <p className="line-clamp-2 text-sm font-semibold">{video.title || "Untitled clip"}</p>
                    <p className="mt-1 truncate text-xs text-white/70">@{video.uploader?.username || "creator"}</p>
                  </div>
                </button>
                <div className="flex items-center justify-between gap-2 p-2">
                  <span className="truncate text-xs text-base-content/65">{video.timestamp}</span>
                  {collections.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(event) => {
                        const collectionId = event.target.value;
                        event.currentTarget.value = "";
                        void addToCollection(video.id, collectionId);
                      }}
                      className="min-w-0 rounded-lg border border-base-300 bg-base-100 px-2 py-1 text-xs outline-none"
                      aria-label="Add to collection"
                    >
                      <option value="" disabled>Add to...</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>{collection.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => void removeSavedVideo(video.id)}
                    disabled={removingId === video.id}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base-content/70 transition hover:bg-base-200 hover:text-error disabled:cursor-wait disabled:opacity-50"
                    aria-label={activeCollectionId === "all" ? "Remove from saved" : "Remove from collection"}
                  >
                    {activeCollectionId === "all" ? <Trash2 size={15} /> : <Plus size={15} className="rotate-45" />}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
