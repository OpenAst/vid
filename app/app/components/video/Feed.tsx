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
    <div className="h-full w-full items-center justify-center overflow-y-scroll overflow-x-hidden snap-y snap-mandatory no-scrollbar bg-white">
      {Array.isArray(videos) &&
        videos.map((video, idx) => (
          <div
            key={video.id}
            data-index={String(idx)}
            ref={(el) => {
              wrapperRefs.current[idx] = el;
            }}
            className="h-full snap-start flex flex-col items-center justify-center relative mb-2"
          >
            <VideoCard
              ref={(el) => {
                videoRefs.current[idx] = el;
              }}
              id={video.id}
              title={video.title}
              thumbnail_url={video.thumbnail_url || null}
              file_url={video.file_url || ""}
              views={video.views || 0}
              timestamp={video.timestamp || "N/A"}
              jwtToken={jwtToken}
              onLike={() => handleLikeVideo(video.id)} // Pass handler
              likes={video.likes}
              user_vote={video.user_vote}
              uploader={{
                id: video.uploader?.id || "",
                username: video.uploader?.username || "Unknown",
                avatar: (video.uploader as any)?.avatar || "",
              }}
              isCommentsOpen={openCommentsFor === video.id}
              onCloseComments={() => setOpenCommentsFor(null)}
            />

            {/* username + views wrapper always here, content conditional */}
            <div className="absolute bottom-4 w-[95%] text-white z-20">
              {openCommentsFor !== video.id && (
                <>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <span className="font-semibold">
                      @{video.uploader?.username || "Unknown"}
                    </span>
                    <span className="text-xs">{video.timestamp}</span>
                  </div>
                  <p className="text-sm mt-1">{video.title}</p>
                </>
              )}
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

            <div className="
                absolute bottom-10 right-1 flex flex-col justify-center items-center gap-2
                z-30
              ">
              <div className="flex flex-col items-center">
                <div className="p-1 rounded-full bg-black/60">
                  <Eye size={24} className="text-white" fill="currentColor" />
                </div>
                <span className="text-xs mt-1 text-white">{video.views || 0}</span>
              </div>

              <button
                onClick={() => handleLikeVideo(video.id)}
                className="flex flex-col items-center hover:scale-110 transition"
              >
                <div className="p-1 rounded-full bg-black/60">
                  <Heart size={24} className={video.user_vote === 1 ? "text-red-500 fill-red-500" : "text-white"} fill="currentColor" />
                </div>
                <span className="text-xs mt-1 text-white">{video.likes}</span>
              </button>

              <button
                onClick={() =>
                  setOpenCommentsFor((prev) => (prev === video.id ? null : video.id))
                }
                className="flex flex-col items-center hover:scale-110 transition"
              >
                <div className="p-1 rounded-full bg-black/60">
                  <MessageCircle className="w-6 h-6 text-white" fill="currentColor " />
                </div>
              </button>

              <button
                onClick={() => handleShare(video)}
                className="flex flex-col items-center hover:scale-110 transition"
              >
                <div className="p-1 rounded-full bg-black/60">
                  <Share2 className="w-6 h-6 text-white" fill="currentColor" />
                </div>
                <span className="text-xs mt-1 text-white">Share</span>
              </button>
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
