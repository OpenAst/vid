"use client";

import CallButton from "@/app/components/calls/CallButton";
import UserAvatar from "@/app/components/common/UserAvatar";
import SupportCreatorButton from "@/app/components/creator/SupportCreatorButton";
import { RootState } from "@/app/store/store";
import type { MembershipTier } from "@/app/store/authSlice";
import { Bookmark, Check, Copy, Heart, MessageCircle, Play, Share2, UserPlus, VideoIcon } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

type VideoDetail = {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  thumbnail_url?: string | null;
  timestamp?: string;
  views?: number;
  likes?: number;
  is_saved?: boolean;
  watch_progress?: {
    progress_seconds: number;
    duration_seconds: number;
    completed: boolean;
    updated_at: string;
  } | null;
  skill_category?: string;
  uploader: {
    id: string;
    email?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
};

type CreatorProfile = {
  id: string;
  username?: string | null;
  first_name?: string;
  last_name?: string;
  is_following?: boolean;
  follower_count?: number;
  following_count?: number;
  profile?: {
    avatar?: string | null;
    bio?: string | null;
    skill_tags?: string;
    availability_status?: string;
    membership_tiers?: MembershipTier[];
  };
};

function getCreatorName(creator?: CreatorProfile | VideoDetail["uploader"] | null) {
  return creator?.first_name || creator?.username || "Creator";
}

export default function VideoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const videoId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const detailVideoRef = useRef<HTMLVideoElement | null>(null);
  const lastProgressSyncRef = useRef(0);

  const loadVideo = useCallback(async () => {
    if (!videoId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/video/${videoId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load video");
      }
      setVideo(data);
      setIsSaved(Boolean(data?.is_saved));

      if (data?.uploader?.username) {
        const creatorResponse = await fetch(`/api/auth/profile?username=${encodeURIComponent(data.uploader.username)}`, {
          cache: "no-store",
        });
        if (creatorResponse.ok) {
          setCreator(await creatorResponse.json());
        }
      }
    } catch (error) {
      console.error("Failed to load video detail", error);
      toast.error(error instanceof Error ? error.message : "Unable to load video");
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    void loadVideo();
  }, [loadVideo]);

  useEffect(() => {
    if (!videoId) return;
    void fetch(`/api/video/${videoId}/view`, { method: "POST" });
  }, [videoId]);

  const shareUrl = typeof window !== "undefined" && videoId ? `${window.location.origin}/video/${videoId}` : "";
  const creatorName = getCreatorName(creator || video?.uploader);
  const creatorAvailability = creator?.profile?.availability_status || "available";
  const isOwnVideo = Boolean(user?.id && video?.uploader?.id === user.id);

  const shareBrandedVideo = async () => {
    if (!video) return;

    setIsSharing(true);
    let exportToast: string | undefined;
    try {
      exportToast = toast.loading("Preparing branded share...");
      const response = await fetch(`/api/video/${video.id}/watermark`, { method: "POST" });
      const data = await response.json().catch(() => null);
      toast.dismiss(exportToast);
      exportToast = undefined;

      if (!response.ok || !data?.watermarked_url) {
        throw new Error(data?.detail || "Unable to prepare branded video");
      }

      const shareData = {
        title: video.title,
        text: `Watch ${video.title} on OneClyq`,
        url: data.watermarked_url as string,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Branded video link copied");
      }
    } catch (error) {
      if (exportToast) toast.dismiss(exportToast);
      if ((error as Error).name !== "AbortError") {
        toast.error(error instanceof Error ? error.message : "Unable to share");
      }
    } finally {
      setIsSharing(false);
    }
  };

  const copyPageLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Video page link copied");
  };

  const toggleSavedVideo = async () => {
    if (!video) return;
    if (!isAuthenticated) {
      toast.error("Sign in to save videos");
      router.push("/login");
      return;
    }

    const previousSaved = isSaved;
    const nextSaved = !previousSaved;
    setIsSaving(true);
    setIsSaved(nextSaved);

    try {
      const response = await fetch(`/api/video/${video.id}/save`, {
        method: nextSaved ? "POST" : "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to update saved videos");
      }
      toast.success(nextSaved ? "Saved to your clips" : "Removed from saved");
    } catch (error) {
      setIsSaved(previousSaved);
      toast.error(error instanceof Error ? error.message : "Unable to update saved videos");
    } finally {
      setIsSaving(false);
    }
  };

  const followCreator = async () => {
    if (!creator?.id || creator.is_following || isFollowLoading) return;

    setIsFollowLoading(true);
    setCreator((current) => current ? { ...current, is_following: true } : current);
    try {
      const response = await fetch(`/api/auth/follow/${creator.id}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to follow");
      }
      setCreator((current) => current ? {
        ...current,
        is_following: true,
        follower_count: Number(data.followers ?? current.follower_count ?? 0),
      } : current);
      toast.success("Following");
    } catch (error) {
      setCreator((current) => current ? { ...current, is_following: false } : current);
      toast.error(error instanceof Error ? error.message : "Unable to follow");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const syncWatchProgress = (completed = false) => {
    const currentVideo = detailVideoRef.current;
    if (!video || !currentVideo || !isAuthenticated) return;

    const durationSeconds = Number.isFinite(currentVideo.duration) ? currentVideo.duration : 0;
    const progressSeconds = completed ? durationSeconds : currentVideo.currentTime;
    if (!completed && progressSeconds < 1) return;

    void fetch(`/api/video/${video.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progress_seconds: progressSeconds,
        duration_seconds: durationSeconds,
        completed,
      }),
    }).catch(() => undefined);
  };

  if (isLoading) {
    return (
      <main className="min-h-[100dvh] bg-base-100 px-4 pb-10 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
        <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="aspect-[9/16] animate-pulse rounded-3xl bg-base-200" />
          <div className="space-y-4">
            <div className="h-10 w-2/3 animate-pulse rounded-full bg-base-200" />
            <div className="h-24 animate-pulse rounded-2xl bg-base-200" />
            <div className="h-32 animate-pulse rounded-2xl bg-base-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!video) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-base-100 px-6 text-center text-base-content">
        <div>
          <VideoIcon className="mx-auto mb-3 text-base-content/35" size={36} />
          <p className="font-semibold">Video not found</p>
          <button type="button" onClick={() => router.push("/discover")} className="mt-4 btn btn-primary btn-sm">
            Explore videos
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-10 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl bg-black shadow-xl">
          <video
            ref={detailVideoRef}
            src={video.file_url}
            poster={video.thumbnail_url || undefined}
            controls
            playsInline
            onLoadedMetadata={(event) => {
              const progress = video.watch_progress;
              if (
                progress &&
                !progress.completed &&
                progress.progress_seconds > 2 &&
                Number.isFinite(event.currentTarget.duration) &&
                progress.progress_seconds < event.currentTarget.duration - 2
              ) {
                event.currentTarget.currentTime = progress.progress_seconds;
              }
            }}
            onTimeUpdate={(event) => {
              const now = Date.now();
              if (now - lastProgressSyncRef.current > 5000) {
                lastProgressSyncRef.current = now;
                syncWatchProgress(false);
              }
            }}
            onPause={() => syncWatchProgress(false)}
            onEnded={() => syncWatchProgress(true)}
            className="aspect-[9/16] h-full w-full object-contain"
          />
          <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1.5 text-white shadow-lg backdrop-blur-md">
            <Image src="/oneclyq.png" alt="" width={18} height={18} className="rounded-full" />
            <span className="text-[11px] font-bold tracking-wide">OneClyq</span>
          </div>
        </section>

        <section className="min-w-0">
          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap gap-2">
              {video.skill_category && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {video.skill_category}
                </span>
              )}
              <span className="rounded-full bg-base-200 px-3 py-1 text-xs font-semibold text-base-content/60">
                {video.timestamp}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">{video.title || "Untitled clip"}</h1>
            {video.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-base-content/70">{video.description}</p>
            )}

            <div className="mt-5 flex flex-wrap gap-4 text-sm text-base-content/65">
              <span><strong className="text-base-content">{video.views || 0}</strong> views</span>
              <span className="inline-flex items-center gap-1">
                <Heart size={15} className="text-rose-500" fill="currentColor" />
                <strong className="text-base-content">{video.likes || 0}</strong> likes
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void shareBrandedVideo()}
                disabled={isSharing}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-content transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Share2 size={16} />
                {isSharing ? "Preparing..." : "Share branded"}
              </button>
              <button
                type="button"
                onClick={() => void copyPageLink()}
                className="inline-flex items-center gap-2 rounded-xl border border-base-300 px-4 py-2 text-sm font-semibold transition hover:bg-base-200"
              >
                <Copy size={16} />
                Copy link
              </button>
              <button
                type="button"
                onClick={() => void toggleSavedVideo()}
                disabled={isSaving}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
                  isSaved
                    ? "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                    : "border-base-300 hover:bg-base-200"
                }`}
              >
                <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
                {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/?videoId=${video.id}`)}
                className="inline-flex items-center gap-2 rounded-xl border border-base-300 px-4 py-2 text-sm font-semibold transition hover:bg-base-200"
              >
                <Play size={16} />
                Open in feed
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => video.uploader?.username && router.push(`/profile/${video.uploader.username}`)}
                className="flex min-w-0 items-center gap-3 text-left"
              >
                <UserAvatar user={creator || video.uploader} size={54} showPresence isOnline={creatorAvailability === "available"} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{creatorName}</p>
                  <p className="truncate text-sm text-base-content/55">@{video.uploader?.username || "creator"}</p>
                  {creator?.follower_count !== undefined && (
                    <p className="mt-0.5 text-xs text-base-content/45">{creator.follower_count} followers</p>
                  )}
                </div>
              </button>

              {isAuthenticated && !isOwnVideo && creator && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void followCreator()}
                    disabled={Boolean(creator.is_following) || isFollowLoading}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      creator.is_following
                        ? "bg-base-200 text-base-content/50"
                        : "bg-primary text-primary-content hover:opacity-90"
                    }`}
                  >
                    {creator.is_following ? <Check size={16} /> : <UserPlus size={16} />}
                    {isFollowLoading ? "..." : creator.is_following ? "Following" : "Follow"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/messages?user=${video.uploader.id}`)}
                    className="inline-flex items-center gap-2 rounded-xl border border-base-300 px-4 py-2 text-sm font-semibold transition hover:bg-base-200"
                  >
                    <MessageCircle size={16} />
                    Message
                  </button>
                  <SupportCreatorButton creatorId={video.uploader.id} creatorName={creatorName} tiers={creator.profile?.membership_tiers} />
                  <CallButton peer={video.uploader} type="audio" availabilityStatus={creatorAvailability} />
                  <CallButton peer={video.uploader} type="video" availabilityStatus={creatorAvailability} />
                </div>
              )}
            </div>

            {creator?.profile?.bio && (
              <p className="mt-4 text-sm leading-6 text-base-content/65">{creator.profile.bio}</p>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-base-300 bg-base-100 p-5 text-sm text-base-content/60">
            Comments are available in the feed view for now. Open this clip in the feed to join the conversation.
          </div>
        </section>
      </div>
    </main>
  );
}
