"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchVideos,
  updateLikes,
  updateViews,
  applyOptimisticLike,
  applyOptimisticView,
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

const FEED_BOOKMARKS_STORAGE_KEY = "feed_bookmarked_videos";

const Feed = ({ jwtToken }: { jwtToken: string }) => {
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
  const next = useSelector((state: RootState) => state.video.next);
  const isLoading = useSelector((state: RootState) => state.video.isLoading);
  const videoCount = Array.isArray(videos) ? videos.length : 0;
  const { isCalling } = useCall();

  const videoRefs = useRef<(VideoCardHandle | null)[]>([]);
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const socketRef = useRef<RealtimeSocket | null>(null);
  const currentIndexRef = useRef(0);
  const rafPlaybackRef = useRef<number | null>(null);

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
    if (typeof window === "undefined") return;

    try {
      const saved = window.localStorage.getItem(FEED_BOOKMARKS_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setBookmarkedVideoIds(new Set(parsed.filter((id): id is string => typeof id === "string")));
      }
    } catch (error) {
      console.error("Failed to load feed bookmarks:", error);
    }
  }, []);

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
    const shareData = {
      title: video.title,
      text: `Check out this video: ${video.title}`,
      url: typeof window !== "undefined" ? window.location.origin + `?video=${video.id}` : "",
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Error sharing:", err);
        toast.error("Failed to share");
      }
    }
  }, []);

  const handleBookmarkToggle = useCallback((video: Video) => {
    setBookmarkedVideoIds((prev) => {
      const nextBookmarks = new Set(prev);
      const isBookmarked = nextBookmarks.has(video.id);

      if (isBookmarked) {
        nextBookmarks.delete(video.id);
      } else {
        nextBookmarks.add(video.id);
      }

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            FEED_BOOKMARKS_STORAGE_KEY,
            JSON.stringify(Array.from(nextBookmarks))
          );
        } catch (error) {
          console.error("Failed to save feed bookmarks:", error);
        }
      }

      toast.success(isBookmarked ? "Removed from bookmarks" : "Saved to bookmarks");
      return nextBookmarks;
    });
  }, []);

  useEffect(() => {
    setPage(1);
    const currentSearch = search || "";
    const hasCachedVideos = Array.isArray(videos) && videos.length > 0;
    const canRefreshInBackground = hasCachedVideos && cacheQuery === currentSearch;

    const id = window.setTimeout(() => {
      dispatch(
        fetchVideos({
          page: 1,
          limit: 10,
          search: currentSearch,
          append: false,
          background: canRefreshInBackground,
        })
      );
    }, 0);

    return () => window.clearTimeout(id);
  }, [dispatch, search, cacheQuery]);

  const fetchMoreVideos = useCallback(() => {
    if (next && !isLoading && !loadingMore) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      dispatch(fetchVideos({ page: nextPage, limit: 10, search: search || "", append: true }))
        .finally(() => setLoadingMore(false));
    }
  }, [dispatch, isLoading, loadingMore, next, page, search]);

  const syncPlaybackForIndex = useCallback((targetIndex: number) => {
    currentIndexRef.current = targetIndex;

    videoRefs.current.forEach((card, idx) => {
      const video = card?.video;
      if (!video) return;

      if (isCalling) {
        video.pause();
        video.muted = true;
        return;
      }

      if (idx === targetIndex) {
        video.muted = card.isMuted;
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
  }, [isCalling]);

  useEffect(() => {
    if (!Array.isArray(videos) || videos.length === 0) return;

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

    const lastEl = wrapperRefs.current[videos.length - 1];
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
  }, [fetchMoreVideos, loadingMore, next, search, syncPlaybackForIndex, videos]);

  useEffect(() => {
    syncPlaybackForIndex(currentIndexRef.current);
  }, [isCalling, videoCount, syncPlaybackForIndex]);

  useEffect(() => {
    if (isError) {
      router.push("/login");
    }
  }, [isError, router]);

  const showInitialSkeleton = isLoading && (!Array.isArray(videos) || videos.length === 0);

  return (
    <div className="h-full w-full items-center justify-center overflow-y-scroll overflow-x-hidden snap-y snap-mandatory no-scrollbar bg-base-100">
      {showInitialSkeleton && <FeedSkeleton count={2} />}

      {Array.isArray(videos) &&
        videos.map((video, idx) => (
          <div
            key={video.id}
            data-index={String(idx)}
            ref={(el) => {
              wrapperRefs.current[idx] = el;
            }}
            className="relative mb-2 flex h-[calc(var(--feed-shell-height)-8px)] w-full snap-start items-center justify-center px-2 sm:px-0"
          >
            <div className="relative flex h-full w-full max-w-[47vh] items-start justify-center overflow-hidden rounded-[22px] bg-black shadow-xl sm:w-[47vh] sm:rounded-2xl">
              <VideoCard
                ref={(el) => {
                  videoRefs.current[idx] = el;
                }}
                id={video.id}
                file_url={video.file_url || ""}
                thumbnail_url={video.thumbnail_url || null}
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
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow-md">Chat</span>
                </button>

                <button
                  onClick={() => handleBookmarkToggle(video)}
                  className="flex flex-col items-center hover:scale-110 active:scale-95 transition"
                  title={bookmarkedVideoIds.has(video.id) ? "Remove bookmark" : "Save video"}
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
