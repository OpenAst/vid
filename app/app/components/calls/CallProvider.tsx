"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Minus, Maximize2 } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store/store";
import { createRealtimeSocket, type RealtimeSocket } from "@/app/lib/socket";
import toast from "react-hot-toast";

type CallType = "audio" | "video";

type CallUser = {
  id: string;
  username?: string | null;
  first_name?: string;
  last_name?: string;
};

type CallRecord = {
  id: string;
  call_type: CallType;
  caller: CallUser;
  callee: CallUser;
  status: string;
};

type IncomingCall = {
  callId: string;
  callType: CallType;
  calleeId: string;
  caller: CallUser;
};

type ActiveCall = {
  callId: string;
  callType: CallType;
  peer: CallUser;
  role: "caller" | "callee";
  status: "ringing" | "connecting" | "connected";
};

type CallContextValue = {
  startCall: (peer: CallUser, callType: CallType) => Promise<void>;
  isCalling: boolean;
  isCallReady: boolean;
  activeCallType: CallType | null;
};

const CallContext = createContext<CallContextValue | null>(null);

async function getTurnIceServers() {
  const response = await fetch("/api/calls/turn-credentials");
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data.iceServers)) return [];

  return data.iceServers.filter((server: { urls?: unknown; username?: unknown; credential?: unknown }) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    const hasTurnUrl = urls.some((url) => typeof url === "string" && url.startsWith("turn:"));

    if (!hasTurnUrl) {
      return urls.some((url) => typeof url === "string" && url.startsWith("stun:"));
    }

    return typeof server.username === "string" && server.username.length > 0
      && typeof server.credential === "string" && server.credential.length > 0;
  });
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used inside CallProvider");
  }
  return context;
}

export default function CallProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token, user } = useSelector((state: RootState) => state.auth);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);

  const socketRef = useRef<RealtimeSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneContextRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);
  const ringtoneTimeoutRef = useRef<number | null>(null);

  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      window.clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneTimeoutRef.current) {
      window.clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }
    ringtoneContextRef.current?.close().catch(() => undefined);
    ringtoneContextRef.current = null;
  }, []);

  const startRingtone = useCallback(() => {
    if (typeof window === "undefined" || ringtoneContextRef.current) {
      return;
    }

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    ringtoneContextRef.current = audioContext;

    const playBurst = () => {
      const now = audioContext.currentTime;
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.connect(audioContext.destination);

      const frequencies = [880, 660];
      frequencies.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.connect(gainNode);

        const startAt = now + index * 0.35;
        oscillator.start(startAt);
        gainNode.gain.setValueAtTime(0.0001, startAt);
        gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.22);
        oscillator.stop(startAt + 0.24);
      });
    };

    void audioContext.resume().then(() => {
      playBurst();
      ringtoneIntervalRef.current = window.setInterval(playBurst, 1700);
    }).catch(() => {
      stopRingtone();
    });
  }, [stopRingtone]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = activeCall?.callType === "video" ? remoteStream : null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = activeCall?.callType === "audio" ? remoteStream : null;
    }
  }, [activeCall?.callType, remoteStream]);

  const cleanupCall = useCallback(() => {
    stopRingtone();
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);
    setActiveCall(null);
    setIsMicMuted(false);
    setIsCallMinimized(false);
  }, [stopRingtone]);

  const createPeerConnection = useCallback(async (callId: string, peerId: string) => {
    const iceServers = await getTurnIceServers();
    const peerConnection = new RTCPeerConnection({ iceServers });

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      socketRef.current?.emit("call:ice-candidate", {
        callId,
        toUserId: peerId,
        signal: event.candidate,
      });
    };

    peerConnection.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      setActiveCall((current) => current ? { ...current, status: "connected" } : current);
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, []);

  const syncLocalStreamState = useCallback((stream: MediaStream) => {
    const nextStream = new MediaStream(stream.getTracks());
    localStreamRef.current = nextStream;
    setLocalStream(nextStream);
    return nextStream;
  }, []);

  const getLocalStream = useCallback(async (callType: CallType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Calls are not supported in this browser");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const renegotiateCall = useCallback(async () => {
    const call = activeCallRef.current;
    const peerConnection = peerConnectionRef.current;
    const socket = socketRef.current;

    if (!call || !peerConnection || !socket) return;

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("call:offer", {
      callId: call.callId,
      toUserId: call.peer.id,
      signal: offer,
    });
  }, []);

  const toggleVideoMode = useCallback(async () => {
    const call = activeCallRef.current;
    const peerConnection = peerConnectionRef.current;
    const socket = socketRef.current;
    const stream = localStreamRef.current;

    if (!call || !peerConnection || !socket || !stream) return;

    const nextCallType: CallType = call.callType === "video" ? "audio" : "video";

    try {
      if (nextCallType === "video") {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        const videoTrack = cameraStream.getVideoTracks()[0];
        if (!videoTrack) {
          throw new Error("Unable to access camera");
        }

        const existingVideoSender = peerConnection.getSenders().find((sender) => sender.track?.kind === "video");
        if (existingVideoSender) {
          await existingVideoSender.replaceTrack(videoTrack);
        } else {
          stream.addTrack(videoTrack);
          peerConnection.addTrack(videoTrack, stream);
        }

        if (!stream.getVideoTracks().includes(videoTrack)) {
          stream.addTrack(videoTrack);
        }
        syncLocalStreamState(stream);
      } else {
        const videoSenders = peerConnection.getSenders().filter((sender) => sender.track?.kind === "video");
        videoSenders.forEach((sender) => {
          try {
            peerConnection.removeTrack(sender);
          } catch {
            sender.track?.stop();
          }
        });

        stream.getVideoTracks().forEach((track) => {
          track.stop();
          stream.removeTrack(track);
        });
        syncLocalStreamState(stream);
      }

      setActiveCall((current) => current ? { ...current, callType: nextCallType } : current);
      socket.emit("call:media-update", {
        callId: call.callId,
        peerId: call.peer.id,
        callType: nextCallType,
      });
      await renegotiateCall();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to switch call mode");
    }
  }, [renegotiateCall, syncLocalStreamState]);

  const startCall = useCallback(async (peer: CallUser, callType: CallType) => {
    if (!isAuthenticated || !token) {
      toast.error("Please log in to start a call");
      return;
    }

    if (!socketRef.current || !isSocketConnected) {
      toast.error("Call connection is still getting ready");
      return;
    }

    try {
      const response = await fetch("/api/calls/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callee_id: peer.id, call_type: callType }),
      });
      const call = await response.json() as CallRecord;

      if (!response.ok) {
        const errorData = call as unknown as { detail?: string; error?: string };
        throw new Error(errorData.detail || errorData.error || "Unable to start call");
      }

      const nextCall: ActiveCall = {
        callId: call.id,
        callType,
        peer,
        role: "caller",
        status: "ringing",
      };
      setActiveCall(nextCall);
      setIsCallMinimized(false);

      const stream = await getLocalStream(callType);
      const peerConnection = await createPeerConnection(call.id, peer.id);
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      socketRef.current.emit("call:invite", {
        callId: call.id,
        calleeId: peer.id,
        callType,
      });
    } catch (error) {
      cleanupCall();
      toast.error(error instanceof Error ? error.message : "Unable to start call");
    }
  }, [cleanupCall, createPeerConnection, getLocalStream, isAuthenticated, isSocketConnected, token]);

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall || !socketRef.current) return;

    try {
      await fetch(`/api/calls/${incomingCall.callId}/accept`, { method: "POST" });
      const nextCall: ActiveCall = {
        callId: incomingCall.callId,
        callType: incomingCall.callType,
        peer: incomingCall.caller,
        role: "callee",
        status: "connecting",
      };
      setActiveCall(nextCall);
      setIsCallMinimized(false);
      setIncomingCall(null);

      const stream = await getLocalStream(incomingCall.callType);
      const peerConnection = await createPeerConnection(incomingCall.callId, incomingCall.caller.id);
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      socketRef.current.emit("call:accept", {
        callId: incomingCall.callId,
        peerId: incomingCall.caller.id,
        callType: incomingCall.callType,
      });
    } catch (error) {
      cleanupCall();
      toast.error(error instanceof Error ? error.message : "Unable to accept call");
    }
  }, [cleanupCall, createPeerConnection, getLocalStream, incomingCall]);

  const rejectIncomingCall = useCallback(async () => {
    if (!incomingCall || !socketRef.current) return;
    await fetch(`/api/calls/${incomingCall.callId}/reject`, { method: "POST" });
    socketRef.current.emit("call:reject", {
      callId: incomingCall.callId,
      peerId: incomingCall.caller.id,
      callType: incomingCall.callType,
    });
    setIncomingCall(null);
  }, [incomingCall]);

  const endCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (call && socketRef.current) {
      await fetch(`/api/calls/${call.callId}/end`, { method: "POST" });
      socketRef.current.emit("call:end", {
        callId: call.callId,
        peerId: call.peer.id,
        callType: call.callType,
      });
    }
    cleanupCall();
  }, [cleanupCall]);

  const toggleMic = () => {
    setIsMicMuted((current) => {
      localStream?.getAudioTracks().forEach((track) => {
        track.enabled = current;
      });
      return !current;
    });
  };

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = createRealtimeSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    socket.on("connect_error", () => {
      setIsSocketConnected(false);
    });

    socket.on("call:incoming", (payload: IncomingCall) => {
      if (activeCallRef.current) {
        socket.emit("call:reject", {
          callId: payload.callId,
          peerId: payload.caller.id,
          callType: payload.callType,
        });
        return;
      }
      setIncomingCall(payload);
    });

    socket.on("call:accepted", async () => {
      const call = activeCallRef.current;
      const peerConnection = peerConnectionRef.current;
      if (!call || call.role !== "caller" || !peerConnection || !socketRef.current) return;

      setActiveCall({ ...call, status: "connecting" });
      await renegotiateCall();
    });

    socket.on("call:rejected", () => {
      toast("Call declined");
      cleanupCall();
    });

    socket.on("call:ended", () => {
      cleanupCall();
    });

    socket.on("call:media-updated", (payload: { callId: string; callType: CallType }) => {
      const call = activeCallRef.current;
      if (!call || call.callId !== payload.callId) return;
      setActiveCall({ ...call, callType: payload.callType });
    });

    socket.on("call:offer", async (payload: { callId: string; fromUserId: string; signal: RTCSessionDescriptionInit }) => {
      const call = activeCallRef.current;
      const peerConnection = peerConnectionRef.current;
      if (!call || call.callId !== payload.callId || !peerConnection || !socketRef.current) return;

      await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.signal));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socketRef.current.emit("call:answer", {
        callId: payload.callId,
        toUserId: payload.fromUserId,
        signal: answer,
      });
    });

    socket.on("call:answer", async (payload: { callId: string; signal: RTCSessionDescriptionInit }) => {
      const call = activeCallRef.current;
      const peerConnection = peerConnectionRef.current;
      if (!call || call.callId !== payload.callId || !peerConnection) return;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.signal));
    });

    socket.on("call:ice-candidate", async (payload: { callId: string; signal: RTCIceCandidateInit }) => {
      const call = activeCallRef.current;
      const peerConnection = peerConnectionRef.current;
      if (!call || call.callId !== payload.callId || !peerConnection) return;
      await peerConnection.addIceCandidate(new RTCIceCandidate(payload.signal));
    });

    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsSocketConnected(false);
    };
  }, [cleanupCall, isAuthenticated, renegotiateCall, token]);

  useEffect(() => {
    if (!isAuthenticated || !token || activeCallRef.current) return;

    let cancelled = false;

    const loadPendingCall = async () => {
      const response = await fetch("/api/calls/pending");
      if (!response.ok) return;

      const data = await response.json();
      const pendingCall = data?.call;
      if (!pendingCall || cancelled || activeCallRef.current) return;

      setIncomingCall({
        callId: pendingCall.id,
        callType: pendingCall.call_type,
        calleeId: pendingCall.callee?.id,
        caller: pendingCall.caller,
      });
    };

    void loadPendingCall().catch((error) => {
      console.error("Failed to load pending call", error);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (incomingCall && !activeCall) {
      startRingtone();
      return;
    }

    stopRingtone();
  }, [activeCall, incomingCall, startRingtone, stopRingtone]);

  const localHasVideo = Boolean(localStream?.getVideoTracks().some((track) => track.readyState === "live"));
  const remoteHasVideo = Boolean(remoteStream?.getVideoTracks().some((track) => track.readyState === "live"));

  return (
    <CallContext.Provider
      value={{
        startCall,
        isCalling: Boolean(activeCall),
        isCallReady: isAuthenticated && isSocketConnected,
        activeCallType: activeCall?.callType ?? null,
      }}
    >
      {children}

      {incomingCall && (
        <div className="fixed inset-x-4 top-6 z-[80] mx-auto max-w-sm rounded-2xl border border-base-300 bg-base-100 p-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {incomingCall.callType === "video" ? <Video size={22} /> : <Phone size={22} />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">@{incomingCall.caller.username || "Someone"}</p>
              <p className="text-sm text-base-content/60">
                Incoming {incomingCall.callType} call
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={rejectIncomingCall} className="btn btn-outline flex-1">
              Decline
            </button>
            <button onClick={acceptIncomingCall} className="btn btn-primary flex-1">
              Answer
            </button>
          </div>
        </div>
      )}

      {activeCall && (
        <>
          <audio ref={remoteAudioRef} autoPlay />

          {isCallMinimized ? (
            <div className="fixed right-3 top-[calc(var(--app-header-height)+6px)] z-[90] w-auto max-w-[calc(100vw-24px)] overflow-hidden rounded-full border border-white/10 bg-neutral-950/95 text-white shadow-2xl backdrop-blur md:right-4">
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setIsCallMinimized(false)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8 text-[11px] font-semibold text-white/85"
                  aria-label="Open call"
                >
                  {(activeCall.peer.username || "U").slice(0, 1).toUpperCase()}
                </button>

                <button
                  type="button"
                  onClick={() => setIsCallMinimized(false)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-[12px] font-semibold leading-4">@{activeCall.peer.username || "user"}</p>
                  <p className="truncate text-[10px] uppercase tracking-wide text-white/55">
                    {activeCall.callType} · {activeCall.status}
                  </p>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleVideoMode}
                    className="btn btn-circle btn-xs btn-outline border-white/15 text-white hover:bg-white/10"
                    aria-label={activeCall.callType === "video" ? "Switch to audio call" : "Switch to video call"}
                  >
                    {activeCall.callType === "video" ? <VideoOff size={12} /> : <Video size={12} />}
                  </button>
                  <button
                    onClick={toggleMic}
                    className="btn btn-circle btn-xs btn-outline border-white/15 text-white hover:bg-white/10"
                    aria-label={isMicMuted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {isMicMuted ? <MicOff size={12} /> : <Mic size={12} />}
                  </button>
                  <button
                    onClick={endCall}
                    className="btn btn-circle btn-xs border-0 bg-red-600 text-white hover:bg-red-700"
                    aria-label="End call"
                  >
                    <PhoneOff size={12} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 text-white">
              <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl">
                <div className="relative aspect-video bg-neutral-900">
                  <button
                    type="button"
                    onClick={() => setIsCallMinimized(true)}
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
                      onClick={toggleVideoMode}
                      className="btn btn-circle btn-outline text-white"
                      aria-label={activeCall.callType === "video" ? "Switch to audio call" : "Switch to video call"}
                    >
                      {activeCall.callType === "video" ? <VideoOff size={18} /> : <Video size={18} />}
                    </button>
                    <button
                      onClick={() => setIsCallMinimized(true)}
                      className="btn btn-circle btn-outline text-white"
                      aria-label="Minimize call"
                    >
                      <Maximize2 size={18} />
                    </button>
                    <button onClick={toggleMic} className="btn btn-circle btn-outline text-white">
                      {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button onClick={endCall} className="btn btn-circle bg-red-600 text-white hover:bg-red-700">
                      <PhoneOff size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </CallContext.Provider>
  );
}
