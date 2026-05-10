export type CallType = "audio" | "video";

export type CallUser = {
  id: string;
  username?: string | null;
  first_name?: string;
  last_name?: string;
  profile?: {
    avatar?: string | null;
  };
};

export type CallRecord = {
  id: string;
  call_type: CallType;
  caller: CallUser;
  callee: CallUser;
  status: string;
};

export type IncomingCall = {
  callId: string;
  callType: CallType;
  calleeId: string;
  caller: CallUser;
};

export type ActiveCall = {
  callId: string;
  callType: CallType;
  peer: CallUser;
  role: "caller" | "callee";
  status: "ringing" | "connecting" | "connected";
};

export type CallContextValue = {
  startCall: (peer: CallUser, callType: CallType) => Promise<void>;
  isCalling: boolean;
  isCallReady: boolean;
  activeCallType: CallType | null;
};
