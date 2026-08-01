"use client";

import React, { memo, forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VolumeX, Volume2, Play, Pause } from "lucide-react";
import Image from "next/image";
import Hls from "hls.js";


interface VideoCardProps {
  id: string;
  file_url: string;
  hls_url?: string | null;
  mediaType?: "video" | "image";
  thumbnail_url: string | null;
  isActive: boolean;
  preload?: "none" | "metadata" | "auto";
  allowSound?: boolean;
  resumeAt?: number;
  isCommentsOpen: boolean;
  onCloseComments: () => void;
  onLike?: () => void;
  onViewOptimistic?: () => void;
  onViewRecorded?: (views: number) => void;
}

export type VideoCardHandle = {
  video: HTMLVideoElement | null;
  isUserPaused: boolean;
  isMuted: boolean;
};

const VideoCardBase = forwardRef<VideoCardHandle, VideoCardProps>(
  (
    {
      id,
      file_url,
      hls_url = null,
      mediaType = "video",
      thumbnail_url,
      isActive,
      preload = "none",
      allowSound = false,
      resumeAt = 0,
      isCommentsOpen,
      onLike,
      onViewOptimistic,
      onViewRecorded,
    },
    ref
  ) => {
    const [isPortrait, setIsPortrait] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isUserPaused, setIsUserPaused] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isMediaReady, setIsMediaReady] = useState(false);
    const [hasMediaError, setHasMediaError] = useState(false);
    const [overlayIcon, setOverlayIcon] = useState<"play" | "pause" | "mute" | "unmute" | null>(null);
    const isImagePost = mediaType === "image";

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const onViewRecordedRef = useRef(onViewRecorded);
    const lastProgressSyncRef = useRef(0);
    const hasAppliedResumeRef = useRef(false);
    const hasUserMutePreferenceRef = useRef(false);
    const hlsRef = useRef<Hls | null>(null);

    useImperativeHandle(ref, () => ({
      video: videoRef.current,
      isUserPaused,
      isMuted,
    }));

    useEffect(() => {
      onViewRecordedRef.current = onViewRecorded;
    }, [onViewRecorded]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video || isImagePost || !hls_url || (!isActive && preload === "none")) return;

      const useMp4Fallback = () => {
        hlsRef.current?.destroy();
        hlsRef.current = null;
        video.src = file_url;
        video.load();
      };

      // Safari has native HLS. Other current browsers use Media Source via
      // hls.js, which selects the rendition that fits the network and viewport.
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hls_url;
        video.load();
        return;
      }

      if (!Hls.isSupported()) {
        useMp4Fallback();
        return;
      }

      const hls = new Hls({
        autoStartLoad: isActive,
        capLevelToPlayerSize: true,
        enableWorker: true,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(hls_url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) useMp4Fallback();
      });

      return () => {
        hls.destroy();
        if (hlsRef.current === hls) hlsRef.current = null;
      };
    }, [file_url, hls_url, isActive, isImagePost, preload]);

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
      hasUserMutePreferenceRef.current = true;
      setIsMuted(videoRef.current.muted);
      setOverlayIcon(videoRef.current.muted ? "mute" : "unmute");
    }

    const togglePlayPause = () => {
      if (!videoRef.current) return;

      if (videoRef.current.paused) {
        void videoRef.current.play().catch((error) => {
          if (!["AbortError", "NotAllowedError"].includes((error as Error).name)) {
            console.error("Failed to play video:", error);
          }
        });
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
        const video = videoRef.current;
        setCurrentTime(video.currentTime);
        const now = Date.now();
        if (now - lastProgressSyncRef.current > 5000 && video.currentTime > 1) {
          lastProgressSyncRef.current = now;
          void fetch(`/api/video/${id}/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              progress_seconds: video.currentTime,
              duration_seconds: Number.isFinite(video.duration) ? video.duration : 0,
              completed: false,
            }),
          }).catch(() => undefined);
        }
      }
    };

    const markMediaReady = () => {
      setIsMediaReady(true);
      setHasMediaError(false);
    };

    const handleLoadedMetadata = () => {
      if (videoRef.current) {
        setDuration(videoRef.current.duration);
        setIsPortrait(videoRef.current.videoHeight > videoRef.current.videoWidth);
        if (
          !hasAppliedResumeRef.current &&
          resumeAt > 2 &&
          Number.isFinite(videoRef.current.duration) &&
          resumeAt < videoRef.current.duration - 2
        ) {
          videoRef.current.currentTime = resumeAt;
          setCurrentTime(resumeAt);
          hasAppliedResumeRef.current = true;
        }
        if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          markMediaReady();
        }
      }
    };

    const handleMediaError = () => {
      setHasMediaError(true);
      setIsMediaReady(false);
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
      lastProgressSyncRef.current = 0;
    };

    const handleDragStart = () => setIsDragging(true);
    const handleDragEnd = () => setIsDragging(false);

    const hasViewedOnce = useRef(false);
    const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

    const recordView = async () => {
      if (hasViewedOnce.current) return;

      try {
        onViewOptimistic?.();
        const response = await fetch(`/api/video/${id}/view`, { method: "POST" });
        const data = await response.json().catch(() => null);
        const totalViews = data?.total_views;
        if (typeof totalViews === "number") {
          onViewRecordedRef.current?.(totalViews);
        }
        hasViewedOnce.current = true;
      } catch {
        hasViewedOnce.current = true;
      }
    };

    useEffect(() => {
      if (!videoRef.current || isUserPaused || hasViewedOnce.current) return;

      const video = videoRef.current;

      const handlePlay = () => {
        if (hasViewedOnce.current) return;

        if (viewTimerRef.current) {
          clearTimeout(viewTimerRef.current);
        }

        const durationSeconds = Number.isFinite(video.duration) ? video.duration : 0;
        const thresholdMs =
          durationSeconds > 0 && durationSeconds < 3
            ? Math.max(Math.round(durationSeconds * 750), 500)
            : 3000;

        viewTimerRef.current = setTimeout(() => {
          void recordView();
        }, thresholdMs);
      };

      const handlePauseOrEnd = () => {
        if (viewTimerRef.current) {
          clearTimeout(viewTimerRef.current);
          viewTimerRef.current = null;
        }
      };

      const handleEnded = () => {
        handlePauseOrEnd();
        void recordView();
        const durationSeconds = Number.isFinite(video.duration) ? video.duration : 0;
        void fetch(`/api/video/${id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            progress_seconds: durationSeconds,
            duration_seconds: durationSeconds,
            completed: true,
          }),
        }).catch(() => undefined);
      };

      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePauseOrEnd);
      video.addEventListener("ended", handleEnded);

      // If already playing when effect runs
      if (!video.paused) {
        handlePlay();
      }

      return () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePauseOrEnd);
        video.removeEventListener("ended", handleEnded);
        if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
      };
    }, [id, isUserPaused]);

    useEffect(() => {
      if (!isImagePost || !isActive || hasViewedOnce.current) return;

      viewTimerRef.current = setTimeout(() => {
        void recordView();
      }, 1200);

      return () => {
        if (viewTimerRef.current) {
          clearTimeout(viewTimerRef.current);
          viewTimerRef.current = null;
        }
      };
    }, [id, isActive, isImagePost]);

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

    useEffect(() => {
      setZoomScale(1);
      setCurrentTime(0);
      setDuration(0);
      setIsPortrait(false);
      setIsMediaReady(false);
      setHasMediaError(false);
      hasViewedOnce.current = false;
      hasAppliedResumeRef.current = false;
      lastProgressSyncRef.current = 0;
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    }, [id, file_url]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video || isImagePost) return;

      if (!isActive) {
        video.pause();
        video.muted = true;
        return;
      }

      // Autoplay must begin muted. Once the viewer has interacted with the
      // page, the active post can continue with sound unless they muted it.
      const shouldMute = !allowSound || (hasUserMutePreferenceRef.current && isMuted);
      video.muted = shouldMute;
      setIsMuted(shouldMute);
      if (!isUserPaused) {
        void video.play().catch((error) => {
          if (!["AbortError", "NotAllowedError"].includes((error as Error).name)) {
            console.error("Failed to start active video playback:", error);
          }
        });
      }
    }, [allowSound, isActive, isMuted, isUserPaused, id, file_url, isImagePost]);

    useEffect(() => {
      if (overlayIcon) {
        const timer = setTimeout(() => setOverlayIcon(null), 800);
        return () => clearTimeout(timer);
      }
    }, [overlayIcon]);

    if (isImagePost) {
      return (
        <motion.div
          animate={{
            height: isCommentsOpen ? "70%" : "100%"
          }}
          transition={{ duration: 0.3 }}
          className="relative mx-auto flex h-full w-full items-center justify-center overflow-hidden bg-black shadow-sm sm:aspect-[9/16] sm:rounded-2xl"
          onDoubleClick={handleLike}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <motion.div
            animate={{ scale: zoomScale }}
            drag={zoomScale > 1}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.5}
            className="relative h-full w-full"
          >
            <Image
              src={file_url}
              alt=""
              fill
              sizes="(min-width: 640px) 47vh, 100vw"
              priority={isActive}
              className="object-contain"
              onLoad={markMediaReady}
              onError={handleMediaError}
            />
          </motion.div>
          <AnimatePresence>
            {(!isMediaReady || hasMediaError) && (
              <motion.div
                key="image-readiness"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 z-10 pointer-events-none overflow-hidden bg-neutral-950 sm:rounded-2xl"
              >
                <div className="absolute inset-0 animate-pulse bg-neutral-900" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-semibold text-white/70">
                    {hasMediaError ? "Image unavailable" : "Loading photo..."}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    }

    return (
      <motion.div
        animate={{
          height: isCommentsOpen ? "70%" : "100%"
        }}
        transition={{ duration: 0.3 }}
        className="relative mx-auto flex h-full w-full items-center justify-center overflow-hidden shadow-sm sm:aspect-[9/16] sm:rounded-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <motion.video
          id={id}
          ref={videoRef}
          src={hls_url ? undefined : file_url}
          poster={thumbnail_url || undefined}
          animate={{ scale: zoomScale }}
          drag={zoomScale > 1}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.5}
          className={`relative h-full w-full bg-black sm:rounded-2xl ${isPortrait ? "object-cover" : "object-contain"
            }`}
          playsInline
          loop
          preload={preload}
          muted={isMuted}
          onClick={handleVideoClick}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={markMediaReady}
          onCanPlay={markMediaReady}
          onPlaying={markMediaReady}
          onError={handleMediaError}
        />
        <AnimatePresence>
          {(!isMediaReady || hasMediaError) && (
            <motion.div
              key="media-readiness"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-10 pointer-events-none overflow-hidden bg-neutral-950 sm:rounded-2xl"
            >
              {thumbnail_url ? (
                <div
                  className="absolute inset-0 scale-105 bg-cover bg-center blur-xl opacity-70"
                  style={{ backgroundImage: `url("${thumbnail_url}")` }}
                />
              ) : (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950" />
              )}
              <div className="absolute inset-0 bg-black/35" />
              {!hasMediaError && (
                <div className="absolute left-4 right-14 bottom-5 space-y-3 opacity-80">
                  <div className="h-3 w-24 rounded-full bg-white/20" />
                  <div className="h-3 w-4/5 rounded-full bg-white/14" />
                  <div className="h-3 w-1/2 rounded-full bg-white/10" />
                </div>
              )}
              {hasMediaError && (
                <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-lg bg-black/45 px-4 py-3 text-center text-sm text-white">
                  Video is still being prepared.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={toggleMute}
          className="absolute top-4 left-4 p-2 rounded-full bg-white/80 backdrop-blur-md border border-white transition-all z-20 hover:scale-110 active:scale-90 shadow-lg"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-black" />
          ) : (
            <Volume2 className="w-5 h-5 text-black" />
          )}
        </button>

        <div className="pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1.5 text-white shadow-lg backdrop-blur-md">
          <Image src="/oneclyq.png" alt="" width={18} height={18} className="rounded-full" />
          <span className="text-[11px] font-bold tracking-wide">OneClyq</span>
        </div>

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

VideoCardBase.displayName = "VideoCard";

const VideoCard = memo(VideoCardBase);
VideoCard.displayName = "MemoizedVideoCard";

export default VideoCard;
