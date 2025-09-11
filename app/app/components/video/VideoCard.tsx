"use client";

import { Eye, Heart, MessageCircle, Share2, X } from "lucide-react";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Comments from "./Comments";

interface Video {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  file_url: string;
  views?: number;
  timestamp?: string;
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface VideoCardProps extends Video {
  jwtToken: string;
  isCommentsOpen: boolean;
  onCloseComments: () => void;
}

export type VideoCardHandle = {
  video: HTMLVideoElement | null;
  isUserPaused: boolean;
};

const VideoCard = forwardRef<VideoCardHandle, VideoCardProps>(
  (
    {
      id,
      title,
      thumbnail_url,
      file_url,
      jwtToken,
      currentUser,
      isCommentsOpen,
      onCloseComments,
    },
    ref
  ) => {
    const [isPortrait, setIsPortrait] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isUserPaused, setIsUserPaused] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);

    useImperativeHandle(ref, () => ({
      video: videoRef.current,
      isUserPaused,
    }));

    const clickTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleVideoClick = () => {
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
        clickTimeout.current = null;
        togglePlayPause();
      } else {
        clickTimeout.current = setTimeout(() => {
          toggleMute();
          clickTimeout.current = null;
        }, 250);
      }
    };

    const toggleMute = () => {
      if (!videoRef.current) return;
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    };

    const togglePlayPause = () => {
      if (!videoRef.current) return;
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsUserPaused(false);
      } else {
        videoRef.current.pause();
        setIsUserPaused(true);
      }
    };

    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center bg-white">
        {/* Video Section */}
        <motion.div
          animate={{ height: isCommentsOpen ? "60%" : "100%" }}
          transition={{ duration: 0.3 }}
          className="relative w-full h-[90vh] max-w-sm rounded-xl aspect-[9/16] overflow-hidden shadow-lg"
        >
          <video
            id={id}
            ref={videoRef}
            src={file_url}
            poster={thumbnail_url || undefined}
            className={`absolute inset-0 w-full h-full bg-black rounded-2xl ${
              isPortrait ? "object-cover" : "object-contain"
            }`}
            playsInline
            autoPlay
            loop
            muted={isMuted}
            onClick={handleVideoClick}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              setIsPortrait(video.videoHeight > video.videoWidth);
            }}
          />
          <button
            onClick={toggleMute}
            className="absolute top-4 left-4 bg-black/50 p-3 rounded-full hover:bg-black/70 transition z-20"
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
        </motion.div>

        <AnimatePresence>
          {isCommentsOpen && (
            <motion.div
              className="bg-white w-full max-w-sm flex-1 rounded-t-2xl shadow-lg mt-2 flex flex-col"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center p-3 border-b">
                <h2 className="font-semibold">Comments</h2>
                <button
                  onClick={onCloseComments}
                  className="hover:rotate-90 transition-transform"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Comments
                  jwtToken={jwtToken}
                  roomId={id}
                  currentUser={currentUser}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

VideoCard.displayName = "VideoCard";

export default VideoCard;
