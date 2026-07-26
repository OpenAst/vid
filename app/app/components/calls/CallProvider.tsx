"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store/store";
import { createRealtimeSocket, type RealtimeSocket } from "@/app/lib/socket";
import toast from "react-hot-toast";
import { ActiveCallOverlay, IncomingCallBanner, MinimizedCallBar } from "./CallPanels";
import { getTurnIceServers } from "./getTurnIceServers";
import type { ActiveCall, CallContextValue, CallRecord, CallType, CallUser, IncomingCall } from "./callTypes";
import { useRingtone } from "./useRingtone";

const CallContext = createContext<CallContextValue | null>(null);
const UNANSWERED_CALL_TIMEOUT_MS = 30_000;

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used inside CallProvider");
  }
  return context;
}

export default function CallProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
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
  const unansweredCallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { startRingtone, stopRingtone } = useRingtone();

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
    if (unansweredCallTimerRef.current) {
      clearTimeout(unansweredCallTimerRef.current);
      unansweredCallTimerRef.current = null;
    }
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

  const markCallMissed = useCallback(async (call: ActiveCall, showToast = true) => {
    try {
      await fetch(`/api/calls/${call.callId}/missed`, { method: "POST" });
      socketRef.current?.emit("call:missed", {
        callId: call.callId,
        peerId: call.peer.id,
        callType: call.callType,
      });
    } catch (error) {
      console.error("Failed to mark call as missed", error);
    } finally {
      cleanupCall();
      if (showToast) {
        toast("No answer");
      }
    }
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

    socket.on("call:missed", () => {
      toast("Missed call");
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
    if (unansweredCallTimerRef.current) {
      clearTimeout(unansweredCallTimerRef.current);
      unansweredCallTimerRef.current = null;
    }

    if (activeCall?.role === "caller" && activeCall.status === "ringing") {
      unansweredCallTimerRef.current = setTimeout(() => {
        const call = activeCallRef.current;
        if (call?.role === "caller" && call.status === "ringing") {
          void markCallMissed(call);
        }
      }, UNANSWERED_CALL_TIMEOUT_MS);
    }

    return () => {
      if (unansweredCallTimerRef.current) {
        clearTimeout(unansweredCallTimerRef.current);
        unansweredCallTimerRef.current = null;
      }
    };
  }, [activeCall?.callId, activeCall?.role, activeCall?.status, markCallMissed]);

  useEffect(() => {
    if (!incomingCall || activeCall) return;

    const timer = setTimeout(() => {
      const call: ActiveCall = {
        callId: incomingCall.callId,
        callType: incomingCall.callType,
        peer: incomingCall.caller,
        role: "callee",
        status: "ringing",
      };
      void markCallMissed(call, false);
    }, UNANSWERED_CALL_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [activeCall, incomingCall, markCallMissed]);

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
    const shouldRing = (incomingCall && !activeCall)
      || (activeCall?.role === "caller" && activeCall.status === "ringing");

    if (shouldRing) {
      startRingtone();
      return;
    }

    stopRingtone();
  }, [activeCall?.role, activeCall?.status, incomingCall, startRingtone, stopRingtone]);

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

      {incomingCall && <IncomingCallBanner incomingCall={incomingCall} onReject={rejectIncomingCall} onAccept={acceptIncomingCall} />}

      {activeCall && (
        <>
          <audio ref={remoteAudioRef} autoPlay />

          {isCallMinimized ? (
            <MinimizedCallBar
              activeCall={activeCall}
              isMicMuted={isMicMuted}
              onExpand={() => setIsCallMinimized(false)}
              onToggleVideoMode={toggleVideoMode}
              onToggleMic={toggleMic}
              onEndCall={endCall}
            />
          ) : (
            <ActiveCallOverlay
              activeCall={activeCall}
              isMicMuted={isMicMuted}
              localHasVideo={localHasVideo}
              remoteHasVideo={remoteHasVideo}
              onMinimize={() => setIsCallMinimized(true)}
              onToggleVideoMode={toggleVideoMode}
              onToggleMic={toggleMic}
              onEndCall={endCall}
              localVideoRef={localVideoRef}
              remoteVideoRef={remoteVideoRef}
            />
          )}
        </>
      )}
    </CallContext.Provider>
  );
}
