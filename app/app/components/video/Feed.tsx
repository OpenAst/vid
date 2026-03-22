"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchVideos, updateLikes, updateViews } from "../../store/videoSlice";
import { RootState, AppDispatch } from "../../store/store";
import VideoCard, { VideoCardHandle } from "./VideoCard";
import CommentsDrawer from "./CommentsDrawer";
import { Heart, Eye, Share2, MessageCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildWebSocketUrl } from "@/app/lib/websocket";
import toast from "react-hot-toast";
import { Video } from "../../store/videoSlice";

const Feed = ({ jwtToken }: { jwtToken: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const videos = useSelector((state: RootState) => state.video.videos);
  const isError = useSelector((state: RootState) => state.video.isError);
  const { token, user } = useSelector((state: RootState) => state.auth);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const next = useSelector((state: RootState) => state.video.next);
  const isLoading = useSelector((state: RootState) => state.video.isLoading);

  const videoRefs = useRef<(VideoCardHandle | null)[]>([]);
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  // Initialize Socket for Video Likes
  useEffect(() => {
    if (!token) return;

    socketRef.current = new WebSocket(buildWebSocketUrl("/ws/video-likes/", token));

    socketRef.current.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "video_vote_updated") {
        dispatch(
          updateLikes({
            videoId: payload.videoId,
            likes: payload.likes,
            liked: payload.liked,
            userId: (user && payload.actorUserId === user.id) ? user.id : undefined,
          })
        );
      } else if (payload.type === "video_view_updated") {
        dispatch(
          updateViews({
            videoId: payload.videoId,
            views: payload.views,
          })
        );
      }
    };

    return () => {
      socketRef.current?.close();
    };
  }, [token, dispatch, user?.id]);

  const handleLikeVideo = (videoId: string) => {
    if (!user || !socketRef.current) {
      // Optimistic UI or error if not logged in? 
      // For now, assume login enforced by auth protection or just do nothing
      return;
    }
    if (socketRef.current.readyState !== WebSocket.OPEN) return;

    socketRef.current.send(
      JSON.stringify({
        action: "like_video",
        videoId,
      })
    );
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
    dispatch(fetchVideos({ page: 1, limit: 10, search: search || "", append: false }));
  }, [dispatch, search]);

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
          void video.play();
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
    <div className="h-[91vh] w-full items-center justify-center overflow-y-scroll overflow-x-hidden snap-y snap-mandatory no-scrollbar bg-white">
      {Array.isArray(videos) &&
        videos.map((video, idx) => (
          <div
            key={video.id}
            data-index={String(idx)}
            ref={(el) => {
              wrapperRefs.current[idx] = el;
            }}
            className="h-full w-full snap-start flex items-center justify-center relative"
          >
            {/* Constrained Center Wrapper */}
            <div className="relative h-full w-[45vh] max-w-full flex items-center justify-center">
              <VideoCard
                ref={(el) => {
                  videoRefs.current[idx] = el;
                }}
                id={video.id}
                file_url={video.file_url || ""}
                thumbnail_url={video.thumbnail_url || null}
                isCommentsOpen={openCommentsFor === video.id}
                onCloseComments={() => setOpenCommentsFor(null)}
              />

              {/* username + metadata wrapper */}
              <div className="absolute bottom-4 left-4 right-12 text-white z-20 pointer-events-none">
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

              {/* Action Buttons - Internal Overlay */}
              <div className="absolute bottom-4 right-2 flex flex-col justify-center items-center gap-2 z-30">
                <div className="flex flex-col items-center">
                  <div className="p-2 rounded-full bg-black/40 backdrop-blur-md shadow-lg border border-white/10">
                    <Eye size={20} className="text-white" fill="currentColor" />
                  </div>
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow-md">{video.views || 0}</span>
                </div>

                <button
                  onClick={() => handleLikeVideo(video.id)}
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
      {loadingMore && (
        <div className="h-20 w-full flex items-center justify-center p-4">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      )}
    </div>
  );
};

export default Feed;
