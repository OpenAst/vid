"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { motion } from "framer-motion";
import { VolumeX, Volume2} from "lucide-react";


interface VideoCardProps {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  views: number;
  duration?: number;
  timestamp: string;
  likes?: number;
  dislikes?: number;
  user_vote?: number;
  jwtToken: string;
  description?: string,
  uploader: {
    id: string;
    avatar?: string;
    username: string;
  }
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
      file_url,
      title,
      description,
      likes,
      dislikes,
      user_vote,
      uploader,
      thumbnail_url,
      isCommentsOpen,
    },
    ref
  ) => {
    const [isPortrait, setIsPortrait] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
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
        handleLike();
      } else {
        clickTimeout.current = setTimeout(() => {
          togglePlayPause();
          clickTimeout.current = null;
        }, 250);
      }
    };

    const toggleMute = () => {
      if (!videoRef.current) return;
      
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }

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

    const handleLike = () => {
      console.log("Video liked ❤️", id);
    }

    return (
        <motion.div
          animate={{
            height: isCommentsOpen ? "70%" : "100%"
          }}
          transition={{ duration: 0.3 }}
          className="relative h-full sm:max-w-sm rounded-2xl aspect-[9/16] overflow-hidden shadow-lg"
        >
          <video
            id={id}
            ref={videoRef}
            src={file_url}
            poster={thumbnail_url || undefined}
            className={`absolute h-full bg-black rounded-2xl ${
              isPortrait ? "object-cover" : "object-contain"
            }`}
            playsInline
            autoPlay
            loop
            muted={true}
            onClick={handleVideoClick}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              setIsPortrait(video.videoHeight > video.videoWidth);
            }}
          />
          <button
            onClick={toggleMute}
            className="absolute top-2 left-2 p-3 sm:p-3 rounded-full bg-black/60 transition z-20"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-white fill-white " />
              ) : (
              <Volume2 className="w-4 h-4 text-white fill-white" />
            )}
          </button>
        </motion.div>
    );
  }
);

VideoCard.displayName = "VideoCard";

export default VideoCard;
