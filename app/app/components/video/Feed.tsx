"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchVideos,
  updateLikes,
  updateViews,
  applyOptimisticLike,
  applyOptimisticView,
} from "../../store/videoSlice";
import { RootState, AppDispatch } from "../../store/store";
import VideoCard, { VideoCardHandle } from "./VideoCard";
import CommentsDrawer from "./CommentsDrawer";
import { Heart, Eye, Share2, MessageCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createRealtimeSocket, type RealtimeSocket } from "@/app/lib/socket";
import toast from "react-hot-toast";
import { Video } from "../../store/videoSlice";

const Feed = ({ jwtToken }: { jwtToken: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const showIntroCard = !search;
  const videos = useSelector((state: RootState) => state.video.videos);
  const cacheQuery = useSelector((state: RootState) => state.video.cacheQuery);
  const isError = useSelector((state: RootState) => state.video.isError);
  const { token, user } = useSelector((state: RootState) => state.auth);

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const next = useSelector((state: RootState) => state.video.next);
  const isLoading = useSelector((state: RootState) => state.video.isLoading);

  const videoRefs = useRef<(VideoCardHandle | null)[]>([]);
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const socketRef = useRef<RealtimeSocket | null>(null);

  const starterTopics = [
    { label: "Start Here", query: "beginner" },
    { label: "Skilled Trades", query: "trades" },
    { label: "Tech Skills", query: "coding" },
    { label: "Business", query: "business" },
  ];

  const handleTopicSelect = (query: string) => {
    router.push(`/?search=${encodeURIComponent(query)}`);
  };

  // Initialize Socket for Video Likes
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

  const handleLikeVideo = (video: Video) => {
    if (!user || !socketRef.current) {
      // Optimistic UI or error if not logged in? 
      // For now, assume login enforced by auth protection or just do nothing
      return;
    }

    const liked = video.user_vote !== 1;
    dispatch(
      applyOptimisticLike({
        videoId: video.id,
        liked,
      })
    );

    socketRef.current.emit("video-likes:like_video", { videoId: video.id });
  };

  const handleShare = async (video: Video) => {
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
  };

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

  const fetchMoreVideos = () => {
    if (next && !isLoading && !loadingMore) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      dispatch(fetchVideos({ page: nextPage, limit: 10, search: search || "", append: true }))
        .finally(() => setLoadingMore(false));
    }
  };

  useEffect(() => {
    if (!Array.isArray(videos) || videos.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const indexAttr = entry.target.getAttribute("data-index");
            const index = indexAttr ? Number(indexAttr) : NaN;
            if (!Number.isNaN(index)) setCurrentIndex(index);
          }
        });
      },
      { threshold: 0.65 }
    );

    wrapperRefs.current.forEach((el) => el && observer.observe(el));

    // Intersection Observer for Infinite Scroll (observing the last element)
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
      observer.disconnect();
      lastElementObserver.disconnect();
    };
  }, [videos, next, isLoading, loadingMore, page, search, dispatch]);

  useEffect(() => {
    videoRefs.current.forEach((card, idx) => {
      const video = card?.video;
      if (!video) return;

      if (idx === currentIndex) {
        if (!card.isUserPaused) {
          void video.play().catch((error) => {
            if ((error as Error).name !== "AbortError") {
              console.error("Failed to start video playback:", error);
            }
          });
        }
        video.muted = card.isUserPaused ? true : false;
      } else {
        video.pause();
        video.currentTime = 0;
        video.muted = true;
      }
    });
  }, [currentIndex]);

  if (isError) {
    router.push('/login');
  }

  return (
    <div className="h-full w-full items-center justify-center overflow-y-scroll overflow-x-hidden snap-y snap-mandatory no-scrollbar bg-base-100">
      {showIntroCard && (
        <div className="h-[90vh] w-full snap-start flex items-center justify-center relative mb-2">
        <div className="relative h-full w-[47vh] max-w-full flex flex-col justify-between rounded-2xl overflow-hidden shadow-xl border border-base-300 bg-gradient-to-b from-primary/10 via-base-100 to-base-200">
          <div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.16),transparent_42%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.1),transparent_38%)]" />

          <div className="relative z-10 p-6 pt-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-base-100/85 border border-base-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/70">
              Learn by watching
            </div>
            <h2 className="mt-5 text-3xl font-black leading-tight text-base-content">
              Short videos.
              <br />
              Real-world skills.
            </h2>
            <p className="mt-3 text-sm leading-6 text-base-content/75 max-w-[28ch]">
              Explore practical lessons, vocational tips, and focused how-tos instead of endless random scrolling.
            </p>
          </div>

          <div className="relative z-10 px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {starterTopics.map((topic) => (
                <button
                  key={topic.query}
                  onClick={() => handleTopicSelect(topic.query)}
                  className="rounded-xl border border-base-300 bg-base-100/85 px-3 py-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
                >
                  <div className="text-sm font-semibold text-base-content">{topic.label}</div>
                  <div className="text-[11px] text-base-content/55 mt-1">Browse {topic.query}</div>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTopicSelect("beginner")}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-content shadow-sm hover:opacity-90 transition"
              >
                Start with beginner lessons
              </button>
              <button
                onClick={() => router.push("/")}
                className="rounded-full border border-base-300 bg-base-100/80 px-4 py-2 text-sm font-semibold text-base-content hover:bg-base-200 transition"
              >
                See featured videos
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      {Array.isArray(videos) &&
        videos.map((video, idx) => (
          <div
            key={video.id}
            data-index={String(idx)}
            ref={(el) => {
              wrapperRefs.current[idx] = el;
            }}
            className="h-[90vh] w-full snap-start flex items-center justify-center relative mb-2"
          >
            {/* Constrained Center Wrapper */}
            <div className="relative h-full w-[47vh] max-w-full flex items-start justify-center rounded-2xl overflow-hidden shadow-xl bg-black">
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

              {/* username + metadata wrapper */}
              <div className="absolute bottom-4 left-4 right-12 text-white z-20 pointer-events-none">
                {openCommentsFor !== video.id && (
                  <div className="drop-shadow-lg">
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <span className="font-semibold">
                      @{video.uploader?.username || "Unknown"}
                    </span>
                      {video.skill_category && (
                        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                          {video.skill_category.replace("_", " ")}
                        </span>
                      )}
                    <span className="text-xs">{video.timestamp}</span>
                  </div>
                    <p className="text-sm mt-1">{video.title}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons - Internal Overlay */}
              <div className="absolute bottom-12 right-2 flex flex-col justify-center items-center gap-2 z-30">
                <div className="flex flex-col items-center">
                  <div className="p-2 rounded-full bg-black/40 backdrop-blur-md shadow-lg border border-white/10">
                    <Eye size={20} className="text-white" fill="currentColor" />
                  </div>
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow-md">{video.views || 0}</span>
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
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow-md">{video.likes}</span>
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
      {/* Bottom Spacer to allow last video to snap to top */}
      <div className="h-[40vh] w-full shrink-0" />
      {loadingMore && (
        <div className="h-20 w-full flex items-center justify-center p-4">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      )}
    </div>
  );
};

export default Feed;
