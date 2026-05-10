"use client";

import { RootState } from "@/app/store/store";
import { BarChart3, Eye, Heart, MessageCircle, Play, Save, TrendingUp, Users, VideoIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

type AnalyticsSummary = {
  total_videos: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_saves: number;
  followers: number;
  watchers: number;
  completion_rate: number;
  average_progress: number;
};

type TopVideo = {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  watchers: number;
  completion_rate: number;
  average_progress: number;
};

type AnalyticsResponse = {
  summary: AnalyticsSummary;
  top_videos: TopVideo[];
};

const summaryCards: Array<{ key: keyof AnalyticsSummary; label: string; icon: typeof Eye }> = [
  { key: "total_views", label: "Views", icon: Eye },
  { key: "total_likes", label: "Likes", icon: Heart },
  { key: "total_comments", label: "Comments", icon: MessageCircle },
  { key: "total_saves", label: "Saves", icon: Save },
  { key: "followers", label: "Followers", icon: Users },
  { key: "completion_rate", label: "Completion", icon: TrendingUp },
];

function formatMetric(value: number, suffix = "") {
  return `${Number(value || 0).toLocaleString()}${suffix}`;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapped } = useSelector((state: RootState) => state.auth);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isBootstrapped && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isBootstrapped, router]);

  const loadAnalytics = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/video/analytics", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to load analytics");
      }
      setAnalytics(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load analytics");
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (!isBootstrapped || !isAuthenticated) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-base-100">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-base-300" aria-hidden="true" />
      </main>
    );
  }

  const summary = analytics?.summary;
  const topVideos = analytics?.top_videos || [];

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-10 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <BarChart3 size={16} />
            Analytics
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Creator analytics</h1>
          <p className="mt-2 text-sm text-base-content/55">A quick look at what is working across your clips.</p>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl bg-base-200" />
            ))}
          </div>
        ) : !summary ? (
          <div className="flex min-h-[48vh] items-center justify-center rounded-2xl border border-dashed border-base-300 px-6 text-center">
            <div>
              <VideoIcon className="mx-auto mb-3 text-base-content/35" size={38} />
              <p className="font-semibold">No analytics yet</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-base-content/55">Upload clips and your performance signals will appear here.</p>
              <button type="button" onClick={() => router.push("/upload")} className="btn btn-primary btn-sm mt-5">
                Upload a clip
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                const suffix = card.key === "completion_rate" ? "%" : "";
                return (
                  <section key={card.key} className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={19} />
                    </div>
                    <p className="text-2xl font-bold">{formatMetric(summary[card.key], suffix)}</p>
                    <p className="mt-1 text-sm text-base-content/55">{card.label}</p>
                  </section>
                );
              })}
            </div>

            <section className="mt-6 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Top clips</h2>
                  <p className="mt-1 text-sm text-base-content/55">Ranked by views, likes, and comments.</p>
                </div>
                <span className="rounded-full bg-base-200 px-3 py-1 text-sm font-semibold">
                  {formatMetric(summary.total_videos)} clips
                </span>
              </div>

              {topVideos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-base-300 px-6 py-10 text-center text-sm text-base-content/55">
                  Your uploaded clips will appear here.
                </div>
              ) : (
                <div className="divide-y divide-base-300">
                  {topVideos.map((video, index) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => router.push(`/video/${video.id}`)}
                      className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-base-200/60"
                    >
                      <span className="w-6 shrink-0 text-sm font-bold text-base-content/45">{index + 1}</span>
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-black">
                        {video.thumbnail_url ? (
                          <Image src={video.thumbnail_url} alt="" fill sizes="48px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/60">
                            <Play size={16} fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{video.title || "Untitled clip"}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-base-content/50">
                          <span>{formatMetric(video.views)} views</span>
                          <span>{formatMetric(video.likes)} likes</span>
                          <span>{formatMetric(video.comments)} comments</span>
                          <span>{formatMetric(video.saves)} saves</span>
                          <span>{formatMetric(video.completion_rate, "%")} completion</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
