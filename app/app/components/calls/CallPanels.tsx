"use client";

import type { RefObject } from "react";
import { Maximize2, Mic, MicOff, Minus, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import type { ActiveCall, IncomingCall } from "./callTypes";

type IncomingCallBannerProps = {
  incomingCall: IncomingCall;
  onReject: () => void;
  onAccept: () => void;
};

export function IncomingCallBanner({ incomingCall, onReject, onAccept }: IncomingCallBannerProps) {
  return (
    <div className="fixed inset-x-4 top-6 z-[80] mx-auto max-w-sm rounded-2xl border border-base-300 bg-base-100 p-4 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {incomingCall.callType === "video" ? <Video size={22} /> : <Phone size={22} />}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">@{incomingCall.caller.username || "Someone"}</p>
          <p className="text-sm text-base-content/60">Incoming {incomingCall.callType} call</p>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <button onClick={onReject} className="btn btn-outline flex-1">
          Decline
        </button>
        <button onClick={onAccept} className="btn btn-primary flex-1">
          Answer
        </button>
      </div>
    </div>
  );
}

type SharedCallControlsProps = {
  isMicMuted: boolean;
  onToggleVideoMode: () => void;
  onToggleMic: () => void;
  onEndCall: () => void;
};

type MinimizedCallBarProps = SharedCallControlsProps & {
  activeCall: ActiveCall;
  onExpand: () => void;
};

export function MinimizedCallBar({
  activeCall,
  isMicMuted,
  onExpand,
  onToggleMic,
  onToggleVideoMode,
  onEndCall,
}: MinimizedCallBarProps) {
  return (
    <div className="fixed right-3 top-[calc(var(--app-header-height)+6px)] z-[90] w-auto max-w-[calc(100vw-24px)] overflow-hidden rounded-full border border-white/10 bg-neutral-950/95 text-white shadow-2xl backdrop-blur md:right-4">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onExpand}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8 text-[11px] font-semibold text-white/85"
          aria-label="Open call"
        >
          {(activeCall.peer.username || "U").slice(0, 1).toUpperCase()}
        </button>

        <button type="button" onClick={onExpand} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[12px] font-semibold leading-4">@{activeCall.peer.username || "user"}</p>
          <p className="truncate text-[10px] uppercase tracking-wide text-white/55">
            {activeCall.callType} · {activeCall.status}
          </p>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleVideoMode}
            className="btn btn-circle btn-xs btn-outline border-white/15 text-white hover:bg-white/10"
            aria-label={activeCall.callType === "video" ? "Switch to audio call" : "Switch to video call"}
          >
            {activeCall.callType === "video" ? <VideoOff size={12} /> : <Video size={12} />}
          </button>
          <button
            onClick={onToggleMic}
            className="btn btn-circle btn-xs btn-outline border-white/15 text-white hover:bg-white/10"
            aria-label={isMicMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMicMuted ? <MicOff size={12} /> : <Mic size={12} />}
          </button>
          <button
            onClick={onEndCall}
            className="btn btn-circle btn-xs border-0 bg-red-600 text-white hover:bg-red-700"
            aria-label="End call"
          >
            <PhoneOff size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

type ActiveCallOverlayProps = SharedCallControlsProps & {
  activeCall: ActiveCall;
  localHasVideo: boolean;
  remoteHasVideo: boolean;
  onMinimize: () => void;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
};

export function ActiveCallOverlay({
  activeCall,
  isMicMuted,
  localHasVideo,
  remoteHasVideo,
  onMinimize,
  onToggleMic,
  onToggleVideoMode,
  onEndCall,
  localVideoRef,
  remoteVideoRef,
}: ActiveCallOverlayProps) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 text-white">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl">
        <div className="relative aspect-video bg-neutral-900">
          <button
            type="button"
            onClick={onMinimize}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
            aria-label="Minimize call"
          >
            <Minus size={18} />
          </button>

          {remoteHasVideo ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold">
                {(activeCall.peer.username || "U").slice(0, 1).toUpperCase()}
              </div>
              <p className="mt-4 text-lg font-semibold">@{activeCall.peer.username || "user"}</p>
              <p className="text-sm text-white/60">
                {activeCall.callType === "video" && localHasVideo ? "video enabled" : activeCall.status}
              </p>
            </div>
          )}

          {localHasVideo && (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute bottom-4 right-4 h-28 w-20 rounded-xl border border-white/20 object-cover shadow-xl"
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold">@{activeCall.peer.username || "user"}</p>
            <p className="text-sm text-white/60">{activeCall.status}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onToggleVideoMode}
              className="btn btn-circle btn-outline text-white"
              aria-label={activeCall.callType === "video" ? "Switch to audio call" : "Switch to video call"}
            >
              {activeCall.callType === "video" ? <VideoOff size={18} /> : <Video size={18} />}
            </button>
            <button
              onClick={onMinimize}
              className="btn btn-circle btn-outline text-white"
              aria-label="Minimize call"
            >
              <Maximize2 size={18} />
            </button>
            <button onClick={onToggleMic} className="btn btn-circle btn-outline text-white">
              {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button onClick={onEndCall} className="btn btn-circle bg-red-600 text-white hover:bg-red-700">
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
