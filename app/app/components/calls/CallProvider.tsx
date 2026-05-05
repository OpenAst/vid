"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, Mic, MicOff } from "lucide-react";
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
};

const CallContext = createContext<CallContextValue | null>(null);

async function getTurnIceServers() {
  const response = await fetch("/api/calls/turn-credentials");
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data.iceServers) ? data.iceServers : [];
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

  const socketRef = useRef<RealtimeSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

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
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);
    setActiveCall(null);
    setIsMicMuted(false);
  }, []);

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

  const getLocalStream = useCallback(async (callType: CallType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Calls are not supported in this browser");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });
    setLocalStream(stream);
    return stream;
  }, []);

  const startCall = useCallback(async (peer: CallUser, callType: CallType) => {
    if (!user) {
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
  }, [cleanupCall, createPeerConnection, getLocalStream, isSocketConnected, user]);

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
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketRef.current.emit("call:offer", {
        callId: call.callId,
        toUserId: call.peer.id,
        signal: offer,
      });
    });

    socket.on("call:rejected", () => {
      toast("Call declined");
      cleanupCall();
    });

    socket.on("call:ended", () => {
      cleanupCall();
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
  }, [cleanupCall, isAuthenticated, token]);

  return (
    <CallContext.Provider
      value={{
        startCall,
        isCalling: Boolean(activeCall),
        isCallReady: isAuthenticated && isSocketConnected,
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
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 text-white">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl">
            <div className="relative aspect-video bg-neutral-900">
              {activeCall.callType === "video" ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold">
                    {(activeCall.peer.username || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <p className="mt-4 text-lg font-semibold">@{activeCall.peer.username || "user"}</p>
                  <p className="text-sm text-white/60">{activeCall.status}</p>
                </div>
              )}
              <audio ref={remoteAudioRef} autoPlay />

              {activeCall.callType === "video" && (
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
    </CallContext.Provider>
  );
}
