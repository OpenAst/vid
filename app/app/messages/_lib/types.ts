export type UserSummary = {
  id: string;
  username?: string | null;
  first_name?: string;
  last_name?: string;
  profile?: {
    avatar?: string | null;
    availability_status?: string;
    skill_tags?: string;
  };
};

export type Message = {
  id: string;
  body: string;
  reply_to?: MessageReply | null;
  message_type?: "text" | "voice";
  audio_url?: string | null;
  audio_duration_ms?: number;
  audio_transcript?: string;
  reaction_counts?: MessageReactionCounts;
  my_reaction?: MessageReaction | null;
  created_at: string;
  read_at?: string | null;
  is_own: boolean;
  sender: UserSummary;
};

export type MessageReaction = "heart" | "laugh" | "fire" | "clap" | "sad";

export type MessageReactionCounts = Partial<Record<MessageReaction, number>>;

export type MessageReply = {
  id: string;
  body: string;
  message_type?: "text" | "voice";
  audio_url?: string | null;
  audio_duration_ms?: number;
  audio_transcript?: string;
  sender: UserSummary;
};

export type CallRecord = {
  id: string;
  caller: UserSummary;
  callee: UserSummary;
  call_type: "audio" | "video";
  status: "ringing" | "accepted" | "rejected" | "missed" | "ended";
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  other_user: UserSummary;
  last_message: Message | null;
  last_call?: CallRecord | null;
  last_activity_at?: string | null;
  unread_count?: number;
  last_message_at: string;
  created_at: string;
};

export type RealtimeMessagePayload = {
  conversationId: string;
  toUserId: string;
  message: Message;
  fromUserId: string;
};

export type MessageReadPayload = {
  conversationId: string;
  toUserId: string;
  messageIds: string[];
  readAt: string;
  fromUserId: string;
};

export type MessageTypingPayload = {
  conversationId: string;
  toUserId: string;
  isTyping: boolean;
  fromUserId: string;
};

export type PresenceSnapshotPayload = {
  onlineUserIds: string[];
};

export type PresenceChangedPayload = {
  userId: string;
  isOnline: boolean;
};

export type CallEventPayload = {
  peerId: string;
  actor?: UserSummary;
};

export type TimelineItem =
  | {
      id: string;
      createdAt: string;
      kind: "message";
      message: Message;
    }
  | {
      id: string;
      createdAt: string;
      kind: "call";
      call: CallRecord;
    };
