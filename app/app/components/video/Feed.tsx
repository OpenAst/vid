"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchVideos,
  updateLikes,
  updateViews,
  applyOptimisticLike,
  applyOptimisticView,
  updateSaveState,
} from "../../store/videoSlice";
import { RootState, AppDispatch } from "../../store/store";
import VideoCard, { type VideoCardHandle } from "./VideoCard";
import CommentsDrawer from "./CommentsDrawer";
import FeedSkeleton from "./FeedSkeleton";
import { Heart, Eye, Share2, MessageCircle, Bookmark } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createRealtimeSocket, type RealtimeSocket } from "@/app/lib/socket";
import toast from "react-hot-toast";
import { type Video } from "../../store/videoSlice";
import { useCall } from "@/app/components/calls/CallProvider";

export type FeedMode = "for-you" | "following" | "latest";

const Feed = ({
  jwtToken,
  feedMode,
  selectedCategory,
}: {
  jwtToken: string;
  feedMode: FeedMode;
  selectedCategory: string;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const videos = useSelector((state: RootState) => state.video.videos);
  const cacheQuery = useSelector((state: RootState) => state.video.cacheQuery);
  const isError = useSelector((state: RootState) => state.video.isError);
  const { token, user } = useSelector((state: RootState) => state.auth);

  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [bookmarkedVideoIds, setBookmarkedVideoIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const next = useSelector((state: RootState) => state.video.next);
  const isLoading = useSelector((state: RootState) => state.video.isLoading);
  const { isCalling } = useCall();
  const viewerCacheScope = user?.id || "guest";
  const forYouShuffleSeedRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const forYouShuffleSeed = feedMode === "for-you" ? `${viewerCacheScope}:${forYouShuffleSeedRef.current}` : undefined;
  const cacheKey = [search || "", feedMode, selectedCategory, viewerCacheScope].join("|");
  const isActiveFeedLoaded = cacheQuery === cacheKey;
  const visibleVideos = isActiveFeedLoaded && Array.isArray(videos) ? videos : null;
  const videoCount = Array.isArray(visibleVideos) ? visibleVideos.length : 0;

  const videoRefs = useRef<(VideoCardHandle | null)[]>([]);
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<RealtimeSocket | null>(null);
  const currentIndexRef = useRef(0);
  const rafPlaybackRef = useRef<number | null>(null);

  useEffect(() => {
    // Browsers prohibit audible autoplay before a real user gesture. The first
    // tap, key press, or swipe unlocks sound for the active post.
    const unlockAudio = () => setHasAudioPermission(true);
    window.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    
    const socket = createRealtimeSocket(token);
    socketRef.current = socket;

    const handleConnect = () => {
      socket.emit("video-likes:join");
      console.log("Socket.IO connected to video-likes feed");
    };

    const handleVideoVoteUpdated = (payload: {
      videoId: string;
      likes: number;
      liked: boolean;
      actorUserId: string;
    }) => {
      dispatch(
        updateLikes({
          videoId: payload.videoId,
          likes: payload.likes,
          liked: payload.liked,
          userId: user && payload.actorUserId === user.id ? user.id : undefined,
        })
      );
    };

    const handleVideoViewUpdated = (payload: { videoId: string; views: number }) => {
      dispatch(
        updateViews({
          videoId: payload.videoId,
          views: payload.views,
        })
      );
    };

    socket.on("connect", handleConnect);
    socket.on("video_vote_updated", handleVideoVoteUpdated);
    socket.on("video_view_updated", handleVideoViewUpdated);
    socket.on("connect_error", (error) => {
      console.error("Socket.IO error in video-likes feed", error);
    });

    socket.connect();
    return () => {
      socket.off("connect", handleConnect);
      socket.off("video_vote_updated", handleVideoVoteUpdated);
      socket.off("video_view_updated", handleVideoViewUpdated);
      socket.disconnect();
    };
  }, [token, dispatch, user?.id]);

  useEffect(() => {
    if (!Array.isArray(visibleVideos)) return;
    setBookmarkedVideoIds(new Set(visibleVideos.filter((video) => video.is_saved).map((video) => video.id)));
  }, [visibleVideos]);

  const handleLikeVideo = useCallback((video: Video) => {
    if (!user || !socketRef.current) return;

    const liked = video.user_vote !== 1;
    dispatch(
      applyOptimisticLike({
        videoId: video.id,
        liked,
      })
    );

    socketRef.current.emit("video-likes:like_video", { videoId: video.id });
  }, [dispatch, user]);

  const handleShare = useCallback(async (video: Video) => {
    let exportToast: string | undefined;
    try {
      if (video.media_type === "image") {
        const pageUrl = typeof window !== "undefined" ? window.location.origin + `/video/${video.id}` : "";
        const shareData = {
          title: video.title,
          text: `View ${video.title} on OneClyq`,
          url: pageUrl,
        };

        if (navigator.share) {
          await navigator.share(shareData);
        } else if (pageUrl) {
          await navigator.clipboard.writeText(pageUrl);
          toast.success("Photo link copied");
        }
        return;
      }

      exportToast = toast.loading("Preparing branded share...");
      const response = await fetch(`/api/video/${video.id}/watermark`, { method: "POST" });
      const data = await response.json().catch(() => null);
      toast.dismiss(exportToast);
      exportToast = undefined;

      if (!response.ok || !data?.watermarked_url) {
        throw new Error(data?.detail || "Unable to prepare branded share");
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
    } catch (err) {
      if (exportToast) {
        toast.dismiss(exportToast);
      }
      if ((err as Error).name !== "AbortError") {
        console.error("Error sharing:", err);
        const fallbackUrl = typeof window !== "undefined" ? window.location.origin + `/video/${video.id}` : "";
        if (fallbackUrl) {
          await navigator.clipboard.writeText(fallbackUrl).catch(() => undefined);
        }
        toast.error(video.media_type === "image" ? "Unable to share photo. Link copied instead." : "Branded export failed. Clip link copied instead.");
      }
    }
  }, []);

  const handleBookmarkToggle = useCallback(async (video: Video) => {
    if (!user) {
      toast.error("Sign in to save posts");
      router.push("/login");
      return;
    }

    const wasSaved = bookmarkedVideoIds.has(video.id);
    const nextSaved = !wasSaved;

    setBookmarkedVideoIds((prev) => {
      const nextBookmarks = new Set(prev);
      if (nextSaved) {
        nextBookmarks.add(video.id);
      } else {
        nextBookmarks.delete(video.id);
      }
      return nextBookmarks;
    });
    dispatch(updateSaveState({ videoId: video.id, isSaved: nextSaved }));

    try {
      const response = await fetch(`/api/video/${video.id}/save`, {
        method: nextSaved ? "POST" : "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to update saved posts");
      }
      toast.success(nextSaved ? "Saved to your posts" : "Removed from saved");
    } catch (error) {
      setBookmarkedVideoIds((prev) => {
        const nextBookmarks = new Set(prev);
        if (wasSaved) {
          nextBookmarks.add(video.id);
        } else {
          nextBookmarks.delete(video.id);
        }
        return nextBookmarks;
      });
      dispatch(updateSaveState({ videoId: video.id, isSaved: wasSaved }));
      toast.error(error instanceof Error ? error.message : "Unable to update saved posts");
    }
  }, [bookmarkedVideoIds, dispatch, router, user]);

  useEffect(() => {
    currentIndexRef.current = 0;
    setActiveIndex(0);
    setOpenCommentsFor(null);
    setLoadingMore(false);
    videoRefs.current = [];
    wrapperRefs.current = [];
    feedScrollRef.current?.scrollTo({ top: 0 });
  }, [cacheKey]);

  useEffect(() => {
    setPage(1);
    const currentSearch = search || "";
    const apiFeed = feedMode === "following" ? "following" : feedMode === "latest" ? "latest" : "for-you";

    const id = window.setTimeout(() => {
      dispatch(
        fetchVideos({
          page: 1,
          limit: 10,
          search: currentSearch,
          feed: apiFeed,
          category: selectedCategory,
          shuffleSeed: forYouShuffleSeed,


          cacheScope: viewerCacheScope,
          append: false,
          background: false,
        })
      );
    }, 0);

    return () => window.clearTimeout(id);
  }, [dispatch, search, cacheKey, feedMode, forYouShuffleSeed, selectedCategory, viewerCacheScope]);

  const fetchMoreVideos = useCallback(() => {
    if (next && !isLoading && !loadingMore) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      dispatch(fetchVideos({
        page: nextPage,
        limit: 10,
        search: search || "",
        feed: feedMode === "following" ? "following" : feedMode === "latest" ? "latest" : "for-you",
        category: selectedCategory,
        shuffleSeed: forYouShuffleSeed,
        cacheScope: viewerCacheScope,
        append: true,
      }))
        .finally(() => setLoadingMore(false));
    }
  }, [dispatch, feedMode, forYouShuffleSeed, isLoading, loadingMore, next, page, search, selectedCategory, viewerCacheScope]);

  const syncPlaybackForIndex = useCallback((targetIndex: number) => {
    const nextIndex = Math.max(0, Math.min(targetIndex, videoRefs.current.length - 1));
    currentIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);

    videoRefs.current.forEach((card, idx) => {
      const video = card?.video;
      if (!video) return;

      if (isCalling) {
        video.pause();
        video.muted = true;
        return;
      }

      if (idx === nextIndex) {
        video.muted = !hasAudioPermission;
        if (!card.isUserPaused) {
          void video.play().catch((error) => {
            if (!["AbortError", "NotAllowedError"].includes((error as Error).name)) {
              console.error("Failed to start video playback:", error);
            }
          });
        }
      } else {
        video.pause();
        video.currentTime = 0;
        video.muted = true;
      }
    });
  }, [hasAudioPermission, isCalling]);

  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, videoCount);
    wrapperRefs.current = wrapperRefs.current.slice(0, videoCount);
    if (currentIndexRef.current >= videoCount) {
      syncPlaybackForIndex(Math.max(0, videoCount - 1));
    }
  }, [syncPlaybackForIndex, videoCount]);

  useEffect(() => {
    if (!Array.isArray(visibleVideos) || visibleVideos.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const bestEntry = visibleEntries[0];
        if (!bestEntry) return;

        const indexAttr = bestEntry.target.getAttribute("data-index");
        const nextIndex = indexAttr ? Number(indexAttr) : NaN;
        if (Number.isNaN(nextIndex) || nextIndex === currentIndexRef.current) return;

        if (rafPlaybackRef.current) {
          cancelAnimationFrame(rafPlaybackRef.current);
        }

        rafPlaybackRef.current = requestAnimationFrame(() => {
          syncPlaybackForIndex(nextIndex);
        });
      },
      { threshold: 0.65 }
    );

    wrapperRefs.current.forEach((el) => el && observer.observe(el));

    const lastElementObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreVideos();
        }
      },
      { threshold: 0.1 }
    );

    const lastEl = wrapperRefs.current[visibleVideos.length - 1];
    if (lastEl) {
      lastElementObserver.observe(lastEl);
    }

    return () => {
      if (rafPlaybackRef.current) {
        cancelAnimationFrame(rafPlaybackRef.current);
        rafPlaybackRef.current = null;
      }
      observer.disconnect();
      lastElementObserver.disconnect();
    };
  }, [fetchMoreVideos, loadingMore, next, search, syncPlaybackForIndex, visibleVideos]);

  useEffect(() => {
    syncPlaybackForIndex(currentIndexRef.current);
  }, [isCalling, videoCount, syncPlaybackForIndex]);

  useEffect(() => {
    if (isError) {
      router.push("/login");
    }
  }, [isError, router]);

  const showInitialSkeleton = !Array.isArray(visibleVideos) || (isLoading && visibleVideos.length === 0);

  return (
    <div
      ref={feedScrollRef}
      className="h-full w-full items-center justify-center overflow-y-scroll overflow-x-hidden snap-y snap-mandatory no-scrollbar bg-black sm:bg-base-100"
    >
      {showInitialSkeleton && <FeedSkeleton count={2} />}

      {!showInitialSkeleton && Array.isArray(visibleVideos) && visibleVideos.length === 0 && (
        <div className="flex h-[calc(var(--feed-shell-height)-96px)] snap-start items-center justify-center px-6 text-center">
          <div>
            <p className="text-lg font-semibold text-base-content">
              {feedMode === "following" ? "No posts from people you follow yet" : "No posts found"}
            </p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-base-content/60">
              {feedMode === "following"
                ? "Follow a few creators from their profiles, then their posts will show up here."
                : "Try another search or category."}
            </p>
          </div>
        </div>
      )}

      {Array.isArray(visibleVideos) &&
        visibleVideos.map((video, idx) => (
          <div
            key={video.id}
            data-index={String(idx)}
            ref={(el) => {
              wrapperRefs.current[idx] = el;
            }}
            className="relative flex h-[var(--feed-shell-height)] w-full snap-start snap-always items-center justify-center overflow-hidden px-0 mb-1 sm:mb-2 sm:h-[calc(var(--feed-shell-height)-8px)]"
          >
            <div className="relative flex h-full w-full max-w-none items-start justify-center overflow-hidden bg-black shadow-xl sm:w-[47vh] sm:max-w-[47vh] sm:rounded-2xl">
              <VideoCard
                ref={(el) => {
                  videoRefs.current[idx] = el;
                }}
                id={video.id}
                file_url={video.file_url || ""}
                hls_url={video.hls_url || null}
                mediaType={video.media_type || "video"}
                thumbnail_url={video.thumbnail_url || null}
                isActive={idx === activeIndex}
                allowSound={hasAudioPermission}
                // Keep network capacity for the post the person is watching. The
                // next card gets just enough data to start promptly after a swipe.
                preload={idx === activeIndex ? "auto" : idx === activeIndex + 1 ? "metadata" : "none"}
                resumeAt={video.watch_progress?.completed ? 0 : video.watch_progress?.progress_seconds || 0}
                isCommentsOpen={openCommentsFor === video.id}
                onCloseComments={() => setOpenCommentsFor(null)}
                onViewOptimistic={() => {
                  dispatch(
                    applyOptimisticView({
                      videoId: video.id,
                    })
                  );
                }}
                onViewRecorded={(views) => {
                  dispatch(
                    updateViews({
                      videoId: video.id,
                      views,
                    })
                  );
                }}
              />

              <div className="pointer-events-none absolute bottom-[calc(var(--feed-bottom-offset)+10px)] left-3 right-14 z-20 text-white sm:bottom-4 sm:left-4 sm:right-12">
                {openCommentsFor !== video.id && (
                  <div className="drop-shadow-lg">
                    <div className="flex items-center gap-2 text-sm opacity-90">
                      <span className="font-semibold">
                        @{video.uploader?.username || "Unknown"}
                      </span>
                      <span className="text-xs">{video.timestamp}</span>
                    </div>
                    <p className="text-sm mt-1">{video.title}</p>
                  </div>
                )}
              </div>

              <div className="absolute bottom-[calc(var(--feed-bottom-offset)+24px)] right-1 z-30 flex flex-col items-center justify-center gap-2 sm:bottom-12 sm:right-2">
                <div className="flex flex-col items-center">
                  <div className="p-2 rounded-full bg-black/40 backdrop-blur-md shadow-lg border border-white/10">
                    <Eye size={20} className="text-white" fill="currentColor" />
                  </div>
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow-md">
                    {video.views || 0}
                  </span>
                </div>

                <button
                  onClick={() => handleLikeVideo(video)}
                  className="flex flex-col items-center hover:scale-110 active:scale-95 transition"
                >
                  <div className="p-2 rounded-full bg-black/40 backdrop-blur-md shadow-lg border border-white/10">
                    <Heart
                      size={20}
                      className={video.user_vote === 1 ? "text-red-500 fill-red-500" : "text-white"}
                      fill="currentColor"
                    />
                  </div>
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow-md">
                    {video.likes}
                  </span>
                </button>

                <button
                  onClick={() => setOpenCommentsFor((prev) => (prev === video.id ? null : video.id))}
                  className="flex flex-col items-center hover:scale-110 active:scale-95 transition"
                >
                  <div className="p-2 rounded-full bg-black/40 backdrop-blur-md shadow-lg border border-white/10">
                    <MessageCircle className="w-5 h-5 text-white" fill="currentColor" />
                  </div>
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow-md">
                    {video.comments_count || 0}
                  </span>
                </button>

                <button
                  onClick={() => handleBookmarkToggle(video)}
                  className="flex flex-col items-center hover:scale-110 active:scale-95 transition"
                  title={bookmarkedVideoIds.has(video.id) ? "Remove bookmark" : "Save post"}
                >
                  <div className="p-2 rounded-full bg-black/40 backdrop-blur-md shadow-lg border border-white/10">
                    <Bookmark
                      className={
                        bookmarkedVideoIds.has(video.id)
                          ? "w-5 h-5 text-amber-300 fill-amber-300"
                          : "w-5 h-5 text-white"
                      }
                      fill={bookmarkedVideoIds.has(video.id) ? "currentColor" : "none"}
                    />
                  </div>
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow-md">
                    {bookmarkedVideoIds.has(video.id) ? "Saved" : "Save"}
                  </span>
                </button>

                <button
                  onClick={() => handleShare(video)}
                  className="flex flex-col items-center hover:scale-110 active:scale-95 transition"
                >
                  <div className="p-2 rounded-full bg-black/40 backdrop-blur-md shadow-lg border border-white/10">
                    <Share2 className="w-5 h-5 text-white" fill="currentColor" />
                  </div>
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow-md">Share</span>
                </button>
              </div>

              {openCommentsFor === video.id && (
                <div className="absolute no-scrollbar bottom-0 w-full z-40">
                  <CommentsDrawer
                    videoId={video.id}
                    jwtToken={token}
                    currentUser={{
                      id: user?.id || "",
                      username: user?.username || "Anonymous",
                    }}
                    videoOwnerId={video.uploader?.id}
                    onClose={() => setOpenCommentsFor(null)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

      {loadingMore && <FeedSkeleton count={1} />}

      <div className="h-[40vh] w-full shrink-0" />
    </div>
  );
};

export default Feed;
