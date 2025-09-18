"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchVideos } from "../../store/videoSlice";
import { RootState, AppDispatch } from "../../store/store";
import VideoCard, { VideoCardHandle } from "./VideoCard";
import CommentsDrawer from "./CommentsDrawer";
import { Heart, Eye, Share2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const Feed = ({ jwtToken }: { jwtToken: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const videos = useSelector((state: RootState) => state.video.videos);
  const isError = useSelector((state: RootState) => state.video.isError);
  const { token, user } = useSelector((state: RootState) => state.auth);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);

  const videoRefs = useRef<(VideoCardHandle | null)[]>([]);
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    dispatch(fetchVideos({ page: 1, limit: 10 }));
  }, [dispatch]);

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

    return () => observer.disconnect();
  }, [videos]);

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
    <div className="flex justify-center relative">

      <div className="h-[95vh] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-white">
        {Array.isArray(videos) &&
          videos.map((video, idx) => (
            <div
              key={video.id}
              data-index={String(idx)}
              ref={(el) => {
                wrapperRefs.current[idx] = el;
              }}
              className="h-[90vh] snap-start flex justify-center relative mb-2"
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
                currentUser={{
                  id: user?.id || "",
                  name: user?.username || "",
                  avatar: user?.avatar,
                }}
                isCommentsOpen={openCommentsFor === video.id}
                onCloseComments={() => setOpenCommentsFor(null)}
              />

              {/* username + views wrapper always here, content conditional */}
              <div className="absolute bottom-4 w-[50vh] text-white z-20">
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
                <div className="absolute bottom-0 w-[40vh]">
                  <CommentsDrawer
                    videoId={video.id}
                    jwtToken={token}
                    currentUser={{
                      id: user?.id || "",
                      name: user?.username || "Anonymous",
                      avatar: user?.avatar,
                    }}
                    onClose={() => setOpenCommentsFor(null)}
                  />
                </div>
              )}

              <div className="
                absolute bottom-24 right-14
                flex flex-col justify-center items-center gap-6
                z-30 text-black
              ">
                <button className="flex flex-col items-center hover:scale-110 transition">
                  <Heart className="w-8 h-8" />
                  <span className=" hidden sm:block text-xs mt-1">Like</span>
                </button>

                <button
                  onClick={() =>
                    setOpenCommentsFor((prev) => (prev === video.id ? null : video.id))
                  }
                  className="flex flex-col items-center hover:scale-110 transition"
                >
                  <MessageCircle className="w-8 h-8" />
                  <span className="hidden sm:block text-xs mt-1">Comments</span>
                </button>

                <button className="flex flex-col items-center hover:scale-110 transition">
                  <Share2 className="w-8 h-8" />
                  <span className="hidden sm:block text-xs mt-1">Share</span>
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Feed;
