"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { VolumeX, Volume2, Play, Pause } from "lucide-react";


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
  onLike?: () => void;
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
      thumbnail_url,
      isCommentsOpen,
      onLike,
    },
    ref
  ) => {
    const [isPortrait, setIsPortrait] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isUserPaused, setIsUserPaused] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [overlayIcon, setOverlayIcon] = useState<"play" | "pause" | "mute" | "unmute" | null>(null);

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
        if (onLike) onLike();
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
      setOverlayIcon(videoRef.current.muted ? "mute" : "unmute");
    }

    const togglePlayPause = () => {
      if (!videoRef.current) return;

      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsUserPaused(false);
        setOverlayIcon("play");
      } else {
        videoRef.current.pause();
        setIsUserPaused(true);
        setOverlayIcon("pause");
      }
    };

    const handleLike = () => {
      if (onLike) onLike();
    }

    const handleTimeUpdate = () => {
      if (videoRef.current && !isDragging) {
        setCurrentTime(videoRef.current.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (videoRef.current) {
        setDuration(videoRef.current.duration);
        setIsPortrait(videoRef.current.videoHeight > videoRef.current.videoWidth);
      }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (!videoRef.current || !duration) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clickedX = Math.max(0, Math.min(x - rect.left, rect.width));
      const percentage = clickedX / rect.width;
      const newTime = percentage * duration;

      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    };

    const handleDragStart = () => setIsDragging(true);
    const handleDragEnd = () => setIsDragging(false);

    const hasViewedOnce = useRef(false);

    useEffect(() => {
      if (!videoRef.current || isUserPaused || hasViewedOnce.current) return;

      const video = videoRef.current;
      let viewTimer: NodeJS.Timeout | null = null;

      const handlePlay = () => {
        if (hasViewedOnce.current) return;

        viewTimer = setTimeout(async () => {
          try {
            await axios.post(`/api/video/${id}/view`);
            hasViewedOnce.current = true;
          } catch (err) {
            console.error("Failed to record view:", err);
          }
        }, 3000);
      };

      const handlePauseOrEnd = () => {
        if (viewTimer) {
          clearTimeout(viewTimer);
          viewTimer = null;
        }
      };

      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePauseOrEnd);
      video.addEventListener("ended", handlePauseOrEnd);

      // If already playing when effect runs
      if (!video.paused) {
        handlePlay();
      }

      return () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePauseOrEnd);
        video.removeEventListener("ended", handlePauseOrEnd);
        if (viewTimer) clearTimeout(viewTimer);
      };
    }, [id, isUserPaused]);

    const [zoomScale, setZoomScale] = useState(1);
    const initialDistance = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        initialDistance.current = dist;
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2 && initialDistance.current) {
        const dist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        const delta = dist / initialDistance.current;
        setZoomScale((prev) => Math.min(Math.max(prev * delta, 1), 5));
        initialDistance.current = dist;
      }
    };

    const handleTouchEnd = () => {
      initialDistance.current = null;
      if (zoomScale < 1.1) setZoomScale(1);
    };

    // Reset zoom when video changes
    useEffect(() => {
      setZoomScale(1);
    }, [id]);

    useEffect(() => {
      if (overlayIcon) {
        const timer = setTimeout(() => setOverlayIcon(null), 800);
        return () => clearTimeout(timer);
      }
    }, [overlayIcon]);

    return (
      <motion.div
        animate={{
          height: isCommentsOpen ? "70%" : "100%"
        }}
        transition={{ duration: 0.3 }}
        className="relative h-full sm:max-w-sm rounded-2xl aspect-[9/16] overflow-hidden shadow-lg"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <motion.video
          id={id}
          ref={videoRef}
          src={file_url}
          poster={thumbnail_url || undefined}
          animate={{ scale: zoomScale }}
          drag={zoomScale > 1}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.5}
          className={`absolute h-full bg-black rounded-2xl ${isPortrait ? "object-cover" : "object-contain"
            }`}
          playsInline
          autoPlay
          loop
          muted={true}
          onClick={handleVideoClick}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
        <button
          onClick={toggleMute}
          className="absolute top-4 left-4 p-2 rounded-full bg-white/80 backdrop-blur-md border border-white transition-all z-20 hover:scale-110 active:scale-90 shadow-lg"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-black" />
          ) : (
            <Volume2 className="w-5 h-5 text-black" />
          )}
        </button>

        <AnimatePresence>
          {overlayIcon && (
            <motion.div
              key={overlayIcon}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
            >
              <div className="bg-black/50 p-6 rounded-full backdrop-blur-sm">
                {overlayIcon === "play" && <Play className="w-12 h-12 text-white fill-white" />}
                {overlayIcon === "pause" && <Pause className="w-12 h-12 text-white fill-white" />}
                {overlayIcon === "mute" && <VolumeX className="w-12 h-12 text-white fill-white" />}
                {overlayIcon === "unmute" && <Volume2 className="w-12 h-12 text-white fill-white" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Seek Bar */}
        {zoomScale <= 1.1 && (
          <div
            className="absolute bottom-0 left-0 w-full h-[2px] bg-white/20 cursor-pointer group hover:h-1 transition-all z-30"
            onClick={handleSeek}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
            onTouchMove={handleSeek}
          >
            <div
              className="h-full bg-red-600 relative transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full scale-0 group-hover:scale-100 transition-transform shadow-lg" />
            </div>
          </div>
        )}
      </motion.div>
    );
  }
);

VideoCard.displayName = "VideoCard";

export default VideoCard;
