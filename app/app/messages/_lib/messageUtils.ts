import type { CallRecord, Conversation, Message, TimelineItem } from "./types";

export const formatStamp = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const getPresenceMeta = (isOnline: boolean) => {
  if (isOnline) {
    return { label: "Active", className: "text-emerald-600", dotClassName: "bg-emerald-500" };
  }

  return { label: "Inactive", className: "text-rose-600", dotClassName: "bg-rose-500" };
};

export const getCallLabel = (call: CallRecord, currentUserId?: string) => {
  const isOutgoing = call.caller.id === currentUserId;
  const kind = call.call_type === "video" ? "video" : "audio";
  const capitalizedKind = `${kind[0].toUpperCase()}${kind.slice(1)}`;

  if (call.status === "missed") {
    return isOutgoing ? `No answer for ${kind} call` : `Missed ${kind} call`;
  }

  if (call.status === "rejected") {
    return isOutgoing ? `${capitalizedKind} call declined` : `Declined ${kind} call`;
  }

  if (call.status === "ended") {
    return `${capitalizedKind} call ended`;
  }

  if (call.status === "accepted") {
    return `${capitalizedKind} call connected`;
  }

  return `${isOutgoing ? "Outgoing" : "Incoming"} ${kind} call`;
};

export const getConversationPreview = (conversation: Conversation, currentUserId?: string) => {
  const messageAt = conversation.last_message?.created_at
    ? new Date(conversation.last_message.created_at).getTime()
    : 0;
  const callAt = conversation.last_call?.created_at
    ? new Date(conversation.last_call.created_at).getTime()
    : 0;

  if (conversation.last_call && callAt >= messageAt) {
    return {
      label: getCallLabel(conversation.last_call, currentUserId),
      timestamp: conversation.last_call.created_at,
      isCall: true,
      isMissed: conversation.last_call.status === "missed",
    };
  }

  if (conversation.last_message) {
    const message = conversation.last_message;
    return {
      label: message.is_deleted_for_everyone
        ? "This message was deleted"
        : message.message_type === "voice"
        ? message.audio_transcript || "Voice note"
        : message.message_type === "image"
          ? message.attachment_name || "Image"
          : message.message_type === "file"
            ? message.attachment_name || "File"
            : message.body,
      timestamp: message.created_at,
      isCall: false,
      isMissed: false,
    };
  }

  return {
    label: "Say hello",
    timestamp: conversation.last_activity_at || conversation.last_message_at,
    isCall: false,
    isMissed: false,
  };
};

export const buildTimelineItems = (messages: Message[], callHistory: CallRecord[]): TimelineItem[] => {
  return [
    ...messages.map((message) => ({
      id: `message-${message.id}`,
      createdAt: message.created_at,
      kind: "message" as const,
      message,
    })),
    ...callHistory.map((call) => ({
      id: `call-${call.id}`,
      createdAt: call.created_at,
      kind: "call" as const,
      call,
    })),
  ].sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
};
