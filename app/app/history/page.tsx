"use client";

import { RootState } from "@/app/store/store";
import type { Video } from "@/app/store/videoSlice";
import { Clock, Play, Trash2, VideoIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

type WatchHistoryItem = {
  id: string;
  video: Video;
  progress_seconds: number;
  duration_seconds: number;
  completed: boolean;
  updated_at: string;
};

function progressPercent(item: WatchHistoryItem) {
  if (!item.duration_seconds) return 0;
  return Math.min(100, Math.max(0, (item.progress_seconds / item.duration_seconds) * 100));
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapped } = useSelector((state: RootState) => state.auth);
  const [items, setItems] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (isBootstrapped && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isBootstrapped, router]);

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/video/history", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to load history");
      }
      setItems(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load history");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const clearHistory = async () => {
    if (isClearing) return;

    setIsClearing(true);
    const previousItems = items;
    setItems([]);
    try {
      const response = await fetch("/api/video/history", { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || data?.error || "Unable to clear history");
      }
      toast.success("History cleared");
    } catch (error) {
      setItems(previousItems);
      toast.error(error instanceof Error ? error.message : "Unable to clear history");
    } finally {
      setIsClearing(false);
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
              <Clock size={16} />
              History
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Continue watching</h1>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => void clearHistory()}
              disabled={isClearing}
              className="inline-flex items-center gap-2 rounded-xl border border-base-300 px-3 py-2 text-sm font-semibold transition hover:bg-base-200 disabled:cursor-wait disabled:opacity-60"
            >
              <Trash2 size={15} />
              Clear
            </button>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="aspect-[9/16] animate-pulse rounded-2xl bg-base-200" />
            ))}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="flex min-h-[48vh] items-center justify-center rounded-2xl border border-dashed border-base-300 px-6 text-center">
            <div>
              <VideoIcon className="mx-auto mb-3 text-base-content/35" size={38} />
              <p className="font-semibold">No watch history yet</p>
              <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-base-content/70">
                Videos you start watching will appear here so you can pick up where you left off.
              </p>
              <button type="button" onClick={() => router.push("/")} className="btn btn-primary btn-sm mt-5">
                Browse feed
              </button>
            </div>
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <article key={item.id} className="group overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
                <button
                  type="button"
                  onClick={() => router.push(`/video/${item.video.id}`)}
                  className="relative block aspect-[9/16] w-full overflow-hidden bg-black text-left"
                >
                  {item.video.thumbnail_url ? (
                    <Image src={item.video.thumbnail_url} alt="" fill sizes="(min-width: 1280px) 18vw, (min-width: 768px) 25vw, 50vw" className="object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <video src={item.video.file_url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                    <Play size={12} fill="currentColor" />
                    {item.completed ? "Watched" : "Resume"}
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div className="h-full bg-primary" style={{ width: `${progressPercent(item)}%` }} />
                  </div>
                  <div className="absolute bottom-3 left-2 right-2 text-white">
                    <p className="line-clamp-2 text-sm font-semibold">{item.video.title || "Untitled clip"}</p>
                    <p className="mt-1 truncate text-xs text-white/70">@{item.video.uploader?.username || "creator"}</p>
                  </div>
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
