"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchVideos, videoLiked, videoUnliked } from "../../store/videoSlice";
import { RootState, AppDispatch } from "../../store/store";
import VideoCard, { VideoCardHandle } from "./VideoCard";
import CommentsDrawer from "./CommentsDrawer";
import { Heart, Eye, Share2, MessageCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildWebSocketUrl } from "@/app/lib/websocket";

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
      if (payload.type !== "video_vote_updated") return;

      if (payload.liked) {
        dispatch(
          videoLiked({
            videoId: payload.videoId,
            likes: payload.likes,
            actorUserId: payload.actorUserId,
            currentUserId: user?.id,
          })
        );
        return;
      }

      dispatch(
        videoUnliked({
          videoId: payload.videoId,
          likes: payload.likes,
          actorUserId: payload.actorUserId,
          currentUserId: user?.id,
        })
      );
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
    <div className="h-[85vh] w-full items-center justify-center overflow-y-scroll overflow-x-hidden snap-y snap-mandatory no-scrollbar bg-white">
      {Array.isArray(videos) &&
        videos.map((video, idx) => (
          <div
            key={video.id}
            data-index={String(idx)}
            ref={(el) => {
              wrapperRefs.current[idx] = el;
            }}
            className="h-full w-[45vh] snap-start flex justify-center relative mb-2"
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
              uploader={{
                id: user?.id || "",
                username: user?.username || "",
                avatar: user?.profile?.avatar || "",
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
                  <div className="flex items-center gap-1 text-xs opacity-80 mt-1">
                    <Eye className="w-4 h-4" />
                    <span>{video.views || 0} views</span>
                  </div>
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
                absolute bottom-10 right-0 flex flex-col justify-center items-center gap-6
                z-30
              ">
              <button
                onClick={() => handleLikeVideo(video.id)}
                className="flex flex-col items-center hover:scale-110 transition"
              >
                <div className="p-1 rounded-full bg-black/60">
                  <Heart size={24} className={video.user_vote === 1 ? "text-red-500 fill-red-500" : "text-white"} />
                </div>
                <span className="hidden sm:block text-xs mt-1 text-white">{video.likes}</span>
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
                <span className="hidden sm:block text-xs mt-1 text-white">Comments</span>
              </button>

              <button className="flex flex-col items-center hover:scale-110 transition">
                <div className="p-1 rounded-full bg-black/60">
                  <Share2 className="w-6 h-6 text-white" fill="currentColor" />
                </div>
                <span className="hidden sm:block text-xs mt-1 text-white">Share</span>
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
