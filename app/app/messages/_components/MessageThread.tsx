"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import CallButton from "@/app/components/calls/CallButton";
import UserSafetyActions from "@/app/components/safety/UserSafetyActions";
import { ArrowLeft, CheckCheck, Copy, Download, FileText, Image as ImageIcon, MessageCircle, Mic, Paperclip, Phone, PhoneMissed, Reply, RotateCcw, Search, Smile, Square, Trash2, Video, X } from "lucide-react";
import { formatStamp, getCallLabel, getPresenceMeta } from "../_lib/messageUtils";
import type { Message, MessageReaction, MessageReply, TimelineItem, UserSummary } from "../_lib/types";
import type { EmojiClickData } from "emoji-picker-react";

type MessageThreadProps = {
  draft: string;
  hasDraft: boolean;
  isLoading: boolean;
  isPeerTyping: boolean;
  isSending: boolean;
  sendError: string | null;
  selectedAttachment: File | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  replyingTo: Message | null;
  selectedPeer: UserSummary | null;
  selectedPeerOnline: boolean;
  showThreadOnMobile: boolean;
  timelineItems: TimelineItem[];
  userId?: string;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onReply: (message: Message) => void;
  onCancelReply: () => void;
  onClearAttachment: () => void;
  onDeleteForEveryone: (message: Message) => Promise<void> | void;
  onDeleteForMe: (message: Message) => Promise<void> | void;
  onFileSelected: (file: File) => void;
  onReact: (message: Message, reaction: MessageReaction) => void;
  onRetrySend: () => void;
  onSendMessage: () => void;
  onSendVoiceNote: (audioBlob: Blob, durationMs: number) => Promise<void> | void;
  onUndoDeleteForMe: (message: Message) => Promise<void> | void;
};

function formatDuration(durationMs?: number) {
  const totalSeconds = Math.max(0, Math.round((durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getReplyLabel(message: Message | MessageReply) {
  if (message.message_type === "voice") return message.audio_transcript || "Voice note";
  if (message.message_type === "image") return message.attachment_name || "Image";
  if (message.message_type === "file") return message.attachment_name || "File";
  return message.body || "Message";
}

const reactionOptions: Array<{ key: MessageReaction; label: string }> = [
  { key: "heart", label: "♥" },
  { key: "laugh", label: "😂" },
  { key: "fire", label: "🔥" },
  { key: "clap", label: "👏" },
  { key: "sad", label: "😢" },
];

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-xl bg-base-200 text-sm font-medium text-base-content/70 sm:h-[320px]">
      Loading emoji keyboard...
    </div>
  ),
});

const emojiPickerStyles = {
  "--epr-bg-color": "hsl(var(--b1))",
  "--epr-category-label-bg-color": "hsl(var(--b1) / 0.96)",
  "--epr-text-color": "hsl(var(--bc))",
  "--epr-search-input-bg-color": "hsl(var(--b2))",
  "--epr-search-input-bg-color-active": "hsl(var(--b1))",
  "--epr-picker-border-color": "hsl(var(--b3))",
  "--epr-hover-bg-color": "hsl(var(--b2))",
  "--epr-highlight-color": "hsl(var(--p))",
  "--epr-focus-bg-color": "hsl(var(--b2))",
} as CSSProperties;

function EmptyThread() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm font-medium text-base-content/70">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageCircle size={24} />
      </div>
      <p className="font-semibold text-base-content">Pick a conversation</p>
      <p className="mt-1 max-w-xs leading-6">Choose a chat from your inbox or start a new one from the people list.</p>
    </div>
  );
}

export default function MessageThread({
  draft,
  hasDraft,
  isLoading,
  isPeerTyping,
  isSending,
  sendError,
  selectedAttachment,
  messagesEndRef,
  replyingTo,
  selectedPeer,
  selectedPeerOnline,
  showThreadOnMobile,
  timelineItems,
  userId,
  onBack,
  onDraftChange,
  onReply,
  onCancelReply,
  onClearAttachment,
  onDeleteForMe,
  onDeleteForEveryone,
  onFileSelected,
  onReact,
  onRetrySend,
  onSendMessage,
  onSendVoiceNote,
  onUndoDeleteForMe,
}: MessageThreadProps) {
  const [blockedPeerIds, setBlockedPeerIds] = useState<Set<string>>(new Set());
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isThreadSearchOpen, setIsThreadSearchOpen] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isSelectedPeerBlocked = Boolean(selectedPeer?.id && blockedPeerIds.has(selectedPeer.id));
  const normalizedThreadSearch = threadSearch.trim().toLowerCase();
  const searchedTimelineItems = normalizedThreadSearch
    ? timelineItems.filter((item) => {
        if (item.kind === "call") {
          return getCallLabel(item.call, userId).toLowerCase().includes(normalizedThreadSearch);
        }

        const message = item.message;
        return [
          message.body,
          message.attachment_name,
          message.audio_transcript,
          message.sender.first_name,
          message.sender.username,
        ].some((value) => value?.toLowerCase().includes(normalizedThreadSearch));
      })
    : timelineItems;

  useEffect(() => {
    if (!isEmojiPickerOpen) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(target)
      ) {
        setIsEmojiPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEmojiPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isEmojiPickerOpen]);

  useEffect(() => {
    setIsEmojiPickerOpen(false);
    setIsThreadSearchOpen(false);
    setThreadSearch("");
  }, [selectedPeer?.id]);

  useEffect(() => {
    if (!selectedPeer || isLoading || normalizedThreadSearch) return;

    const scrollToBottom = () => {
      if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      }
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    };

    const animationFrame = window.requestAnimationFrame(scrollToBottom);
    const timer = window.setTimeout(scrollToBottom, 80);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timer);
    };
  }, [isLoading, messagesEndRef, normalizedThreadSearch, selectedPeer?.id, timelineItems.length]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }, [draft]);

  const copyMessage = async (message: Message) => {
    if (!message.body || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(message.body);
    setActiveActionMessageId(null);
  };

  const deleteMessageForMe = async (message: Message) => {
    setActiveActionMessageId(null);
    try {
      await onDeleteForMe(message);
      toast.custom((toastInstance) => (
        <div className="flex max-w-sm items-center gap-3 rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content shadow-xl">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Message deleted for you</p>
            <p className="mt-0.5 text-xs text-base-content/55">The other person may still see it. Undo is available for 5 minutes.</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await onUndoDeleteForMe(message);
                toast.dismiss(toastInstance.id);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to restore message");
              }
            }}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-content transition hover:bg-primary/90"
          >
            Undo
          </button>
        </div>
      ), { duration: 5 * 60 * 1000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete message");
    }
  };

  const deleteMessageForEveryone = async (message: Message) => {
    setActiveActionMessageId(null);
    try {
      await onDeleteForEveryone(message);
      toast.success("Message deleted for everyone");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete message for everyone");
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? draft.length;
    const selectionEnd = textarea?.selectionEnd ?? draft.length;
    const nextDraft = `${draft.slice(0, selectionStart)}${emoji}${draft.slice(selectionEnd)}`;
    const nextCursor = selectionStart + emoji.length;

    onDraftChange(nextDraft);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    insertEmoji(emojiData.emoji);
  };

  const sendCurrentMessage = () => {
    setIsEmojiPickerOpen(false);
    onSendMessage();
  };

  const stopRecordingStream = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  };

  const startVoiceRecording = async () => {
    if (
      isSelectedPeerBlocked ||
      isRecording ||
      typeof navigator === "undefined" ||
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) return;

    try {
      setIsEmojiPickerOpen(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      setRecordingStartedAt(Date.now());
      setIsRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopRecordingStream();
        setIsRecording(false);
      };
      recorder.start();
    } catch (error) {
      console.error("Could not start voice recording", error);
    }
  };

  const finishVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    const startedAt = recordingStartedAt || Date.now();

    recorder.onstop = () => {
      const type = recorder.mimeType || "audio/webm";
      const audioBlob = new Blob(recordedChunksRef.current, { type });
      stopRecordingStream();
      setIsRecording(false);
      setRecordingStartedAt(null);
      recordedChunksRef.current = [];
      if (audioBlob.size > 0) {
        void onSendVoiceNote(audioBlob, Date.now() - startedAt);
      }
    };
    recorder.stop();
  };

  const cancelVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    recordedChunksRef.current = [];
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        stopRecordingStream();
        setIsRecording(false);
        setRecordingStartedAt(null);
      };
      recorder.stop();
      return;
    }
    stopRecordingStream();
    setIsRecording(false);
    setRecordingStartedAt(null);
  };

  return (
    <section className={`min-h-0 flex-col overflow-hidden bg-base-100 md:flex ${!showThreadOnMobile ? "hidden md:flex" : "flex"}`}>
      {selectedPeer ? (
        <>
          {(() => {
            const presence = getPresenceMeta(selectedPeerOnline);
            return (
              <div className="flex items-start justify-between gap-3 border-b border-base-300 px-3 py-3 sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    onClick={onBack}
                    className="ml-12 mt-0.5 rounded-full p-2 text-base-content/70 transition hover:bg-base-200 hover:text-base-content md:ml-0 md:hidden"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold sm:text-lg">
                      {selectedPeer.first_name || selectedPeer.username || "Conversation"}
                    </p>
                    <p className="truncate text-sm font-medium text-base-content/70">@{selectedPeer.username || "user"}</p>
                    <p className={`mt-0.5 flex items-center gap-1.5 text-xs font-medium ${presence.className}`}>
                      <span className={`h-2 w-2 rounded-full ${presence.dotClassName}`} aria-hidden="true" />
                      {presence.label}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsThreadSearchOpen((current) => !current)}
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                      isThreadSearchOpen
                        ? "border-primary/35 bg-primary/10 text-primary"
                        : "border-base-300 bg-base-100 text-base-content/70 hover:bg-base-200 hover:text-base-content"
                    }`}
                    aria-label="Search this conversation"
                    aria-expanded={isThreadSearchOpen}
                  >
                    <Search size={17} />
                  </button>
                  {!isSelectedPeerBlocked && (
                    <>
                      <CallButton peer={selectedPeer} type="audio" availabilityStatus={selectedPeer.profile?.availability_status} />
                      <CallButton peer={selectedPeer} type="video" availabilityStatus={selectedPeer.profile?.availability_status} />
                    </>
                  )}
                  <UserSafetyActions
                    userId={selectedPeer.id}
                    userLabel={`@${selectedPeer.username || "user"}`}
                    isBlocked={isSelectedPeerBlocked}
                    compact
                    onBlockChange={(nextBlocked) => {
                      setBlockedPeerIds((current) => {
                        const next = new Set(current);
                        if (nextBlocked) {
                          next.add(selectedPeer.id);
                        } else {
                          next.delete(selectedPeer.id);
                        }
                        return next;
                      });
                    }}
                  />
                </div>
              </div>
            );
          })()}

          {isThreadSearchOpen && (
            <div className="border-b border-base-300 px-3 py-2 sm:px-5">
              <div className="flex items-center gap-2 rounded-2xl border border-base-300 bg-base-100 px-3 py-2 text-base-content/70 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <Search size={16} aria-hidden="true" />
                <input
                  value={threadSearch}
                  onChange={(event) => setThreadSearch(event.target.value)}
                  type="search"
                  placeholder="Search this conversation"
                  className="min-w-0 flex-1 bg-transparent text-sm text-base-content outline-none placeholder:text-base-content/40"
                  autoFocus
                />
                {threadSearch && (
                  <span className="text-xs font-semibold text-base-content/70">
                    {searchedTimelineItems.length}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (threadSearch) {
                      setThreadSearch("");
                      return;
                    }
                    setIsThreadSearchOpen(false);
                  }}
                  className="rounded-full p-1 text-base-content/50 transition hover:bg-base-200 hover:text-base-content"
                  aria-label={threadSearch ? "Clear conversation search" : "Close conversation search"}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <div ref={messageListRef} className="thin-scrollbar flex-1 overflow-y-auto bg-base-100 px-3 py-4 sm:px-5">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-12 animate-pulse rounded-2xl ${index % 2 === 0 ? "mr-10 bg-base-200 sm:mr-16" : "ml-10 bg-green-200 sm:ml-16"}`}
                  />
                ))}
              </div>
            ) : timelineItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm font-medium text-base-content/70">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageCircle size={24} />
                </div>
                <p className="font-semibold text-base-content">No messages yet</p>
                <p className="mt-1 max-w-xs leading-6">Say hello and start the conversation here.</p>
              </div>
            ) : normalizedThreadSearch && searchedTimelineItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm font-medium text-base-content/70">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Search size={24} />
                </div>
                <p className="font-semibold text-base-content">No messages found</p>
                <p className="mt-1 max-w-xs leading-6">Try another word, name, file name, or transcript.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchedTimelineItems.map((item) => {
                  if (item.kind === "call") {
                    const isMissed = item.call.status === "missed";
                    const isOutgoing = item.call.caller.id === userId;
                    const CallIcon = item.call.call_type === "video" ? Video : isMissed ? PhoneMissed : Phone;

                    return (
                      <div key={item.id} className="flex justify-center">
                        <div className={`flex max-w-[92%] items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-sm sm:max-w-[80%] ${
                          isMissed
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-base-300 bg-base-200 text-base-content/70"
                        }`}
                        >
                          <CallIcon size={14} aria-hidden="true" />
                          <span className="truncate font-medium">{getCallLabel(item.call, userId)}</span>
                          <span className={isMissed ? "text-rose-500/80" : "text-base-content/45"}>
                            {formatStamp(item.call.created_at)}
                          </span>
                          <span className={isMissed ? "text-rose-500/60" : "text-base-content/35"}>
                            {isOutgoing ? "You called" : "They called"}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const { message } = item;
                  const showActions = activeActionMessageId === message.id;
                  const isDeletedForEveryone = Boolean(message.is_deleted_for_everyone);

                  return (
                    <div
                      key={item.id}
                      className={`flex ${message.is_own ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`group relative flex max-w-[92%] flex-col ${message.is_own ? "items-end" : "items-start"} sm:max-w-[84%]`}>
                      <div
                        onClick={() => {
                          if (!isDeletedForEveryone) {
                            setActiveActionMessageId((current) => current === message.id ? null : message.id);
                          }
                        }}
                        className={`w-fit max-w-full cursor-pointer rounded-xl px-3 py-2 text-sm shadow-sm ${
                          isDeletedForEveryone
                            ? "border border-dashed border-base-300 bg-base-200 text-base-content/55"
                            : message.is_own
                            ? "bg-green-600 text-white"
                            : "border border-base-300 bg-base-200 text-base-content"
                        }`}
                      >
                        {isDeletedForEveryone ? (
                          <p className="italic">This message was deleted</p>
                        ) : message.reply_to && (
                          <div className={`mb-1.5 max-w-[260px] rounded-lg border-l-2 px-2 py-1 text-xs ${
                            message.is_own
                              ? "border-white/60 bg-white/10 text-white/85"
                              : "border-primary/60 bg-base-100/70 text-base-content/70"
                          }`}>
                            <p className="truncate font-semibold">
                              {message.reply_to.sender.first_name || message.reply_to.sender.username || "Message"}
                            </p>
                            <p className="truncate">{getReplyLabel(message.reply_to)}</p>
                          </div>
                        )}
                        {!isDeletedForEveryone && message.message_type === "voice" && message.audio_url ? (
                          <div className="w-[min(72vw,360px)] sm:w-[360px]">
                            <div className="mb-1.5 flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 text-xs font-semibold">
                                <Mic size={13} aria-hidden="true" />
                                Voice note
                              </span>
                              <span className={message.is_own ? "text-xs text-white/75" : "text-xs text-base-content/50"}>
                                {formatDuration(message.audio_duration_ms)}
                              </span>
                            </div>
                            <audio src={message.audio_url} controls preload="metadata" className="h-9 w-full max-w-full" />
                            {message.audio_transcript && (
                              <details className={`mt-2 rounded-lg px-2 py-1 text-xs ${
                                message.is_own
                                  ? "bg-white/10 text-white/85"
                                  : "bg-base-100/70 text-base-content/70"
                              }`}>
                                <summary className="cursor-pointer font-semibold">Transcript</summary>
                                <p className="mt-1 whitespace-pre-wrap leading-5">{message.audio_transcript}</p>
                              </details>
                            )}
                          </div>
                        ) : !isDeletedForEveryone && message.message_type === "image" && message.attachment_url ? (
                          <div className="w-[min(72vw,360px)] sm:w-[360px]">
                            <img
                              src={message.attachment_url}
                              alt={message.attachment_name || "Attached image"}
                              className="max-h-72 w-full rounded-lg object-cover"
                            />
                            {message.body && <p className="mt-2 whitespace-pre-wrap break-words leading-5">{message.body}</p>}
                          </div>
                        ) : !isDeletedForEveryone && message.message_type === "file" && message.attachment_url ? (
                          <a
                            href={message.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex w-[min(72vw,320px)] items-center gap-3 rounded-lg border px-3 py-2 ${
                              message.is_own ? "border-white/20 bg-white/10 text-white" : "border-base-300 bg-base-100 text-base-content"
                            }`}
                          >
                            <FileText size={20} aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate font-medium">{message.attachment_name || "Attachment"}</span>
                            <Download size={16} aria-hidden="true" />
                          </a>
                        ) : !isDeletedForEveryone ? (
                          <p className="whitespace-pre-wrap break-words leading-5">{message.body}</p>
                        ) : null}
                        <p className={`mt-0.5 flex items-center gap-1 text-[11px] ${message.is_own ? "justify-end text-white/75" : "text-base-content/50"}`}>
                          <span>{formatStamp(message.created_at)}</span>
                          {message.is_own && (
                            <CheckCheck
                              size={14}
                              className={message.read_at ? "text-sky-300" : "text-white/75"}
                              aria-label={message.read_at ? "Read" : "Delivered"}
                            />
                          )}
                        </p>
                      </div>
                      {!isDeletedForEveryone && message.reaction_counts && Object.entries(message.reaction_counts).some(([, count]) => Number(count) > 0) && (
                        <div className={`mt-1 flex flex-wrap gap-1 ${message.is_own ? "justify-end" : "justify-start"}`}>
                          {reactionOptions.map(({ key, label }) => {
                            const count = message.reaction_counts?.[key] || 0;
                            if (count <= 0) return null;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => onReact(message, key)}
                                className={`rounded-full border px-2 py-0.5 text-xs shadow-sm ${
                                  message.my_reaction === key
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-base-300 bg-base-100 text-base-content/70"
                                }`}
                              >
                                {label} {count}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {showActions && !isDeletedForEveryone && (
                        <div className={`mt-1 flex flex-wrap items-center gap-1 rounded-2xl border border-base-300 bg-base-100 p-1 text-xs shadow-lg ${message.is_own ? "mr-1 justify-end" : "ml-1"}`}>
                          {reactionOptions.map(({ key, label }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                onReact(message, key);
                                setActiveActionMessageId(null);
                              }}
                              className={`rounded-full px-2 py-1 transition hover:bg-base-200 ${
                                message.my_reaction === key ? "bg-primary/10 text-primary" : "text-base-content/80"
                              }`}
                              aria-label={`React with ${key}`}
                            >
                              {label}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              onReply(message);
                              setActiveActionMessageId(null);
                            }}
                            className="flex items-center gap-1 rounded-full px-2 py-1 text-base-content/70 transition hover:bg-base-200 hover:text-base-content"
                          >
                            <Reply size={13} />
                            Reply
                          </button>
                          {message.body && (
                            <button
                              type="button"
                              onClick={() => void copyMessage(message)}
                              className="flex items-center gap-1 rounded-full px-2 py-1 text-base-content/70 transition hover:bg-base-200 hover:text-base-content"
                            >
                              <Copy size={13} />
                              Copy
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void deleteMessageForMe(message)}
                            className="flex items-center gap-1 rounded-full px-2 py-1 text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2 size={13} />
                            Delete for me
                          </button>
                          {message.is_own && (
                            <button
                              type="button"
                              onClick={() => void deleteMessageForEveryone(message)}
                              className="flex items-center gap-1 rounded-full px-2 py-1 text-rose-700 transition hover:bg-rose-50"
                            >
                              <Trash2 size={13} />
                              Delete for everyone
                            </button>
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-base-300 px-3 py-3 pb-[calc(var(--safe-area-bottom)+12px)] sm:px-5">
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-base-300 bg-base-200/70 px-3 py-2 text-sm">
                <div className="min-w-0 border-l-2 border-primary pl-2">
                  <p className="text-xs font-semibold text-base-content/70">
                    Replying to {replyingTo.sender.first_name || replyingTo.sender.username || "message"}
                  </p>
                  <p className="truncate text-xs text-base-content/55">{getReplyLabel(replyingTo)}</p>
                </div>
                <button type="button" onClick={onCancelReply} className="rounded-full p-1.5 text-base-content/60 transition hover:bg-base-300 hover:text-base-content" aria-label="Cancel reply">
                  <X size={15} />
                </button>
              </div>
            )}
            {isPeerTyping && (
              <div className="mb-2 flex items-center gap-2 px-1 text-xs font-medium text-base-content/55">
                <span>{selectedPeer.first_name || selectedPeer.username || "They"} is typing</span>
                <span className="flex items-center gap-0.5" aria-hidden="true">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-base-content/45" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-base-content/45 [animation-delay:120ms]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-base-content/45 [animation-delay:240ms]" />
                </span>
              </div>
            )}
            {selectedAttachment && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-base-300 bg-base-200/70 px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  {selectedAttachment.type.startsWith("image/") ? <ImageIcon size={16} /> : <FileText size={16} />}
                  <span className="truncate font-medium">{selectedAttachment.name}</span>
                </div>
                <button type="button" onClick={onClearAttachment} className="rounded-full p-1.5 text-base-content/60 transition hover:bg-base-300 hover:text-base-content" aria-label="Remove attachment">
                  <X size={15} />
                </button>
              </div>
            )}
            {sendError && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <span className="min-w-0 truncate">{sendError}</span>
                <button type="button" onClick={onRetrySend} className="flex items-center gap-1 rounded-full px-2 py-1 font-semibold transition hover:bg-rose-100">
                  <RotateCcw size={14} />
                  Retry
                </button>
              </div>
            )}
            <div className="flex items-end gap-1.5 sm:gap-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,application/pdf,text/*,application/zip"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onFileSelected(file);
                  event.currentTarget.value = "";
                }}
              />
              {isRecording ? (
                <div className="flex min-h-[52px] flex-1 items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" aria-hidden="true" />
                    Recording
                  </span>
                  <button type="button" onClick={cancelVoiceRecording} className="rounded-full p-2 transition hover:bg-rose-100" aria-label="Cancel voice note">
                    <Trash2 size={17} />
                  </button>
                </div>
              ) : (
                <textarea
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendCurrentMessage();
                    }
                  }}
                  rows={1}
                  ref={textareaRef}
                  placeholder={isSelectedPeerBlocked ? "Unblock this user to send messages" : "Write a message..."}
                  disabled={isSelectedPeerBlocked}
                  className="min-h-[48px] max-h-36 min-w-0 flex-1 resize-none rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-sm font-medium outline-none transition placeholder:text-base-content/45 focus:border-primary focus:ring-2 focus:ring-primary/20 sm:min-h-[52px]"
                />
              )}
              {!isRecording && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSelectedPeerBlocked || isSending}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-base-300 bg-base-100 text-base-content/70 transition hover:bg-base-200 hover:text-base-content disabled:cursor-not-allowed disabled:text-base-content/35 sm:h-[52px] sm:w-[52px]"
                  aria-label="Attach file"
                >
                  <Paperclip size={18} />
                </button>
              )}
              {!isRecording && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    ref={emojiButtonRef}
                    onClick={() => setIsEmojiPickerOpen((current) => !current)}
                    disabled={isSelectedPeerBlocked}
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-base-300 bg-base-100 text-base-content/70 transition hover:bg-base-200 hover:text-base-content disabled:cursor-not-allowed disabled:text-base-content/35 sm:h-[52px] sm:w-[52px] ${
                      isEmojiPickerOpen ? "border-primary text-primary ring-2 ring-primary/20" : ""
                    }`}
                    aria-label="Open emoji keyboard"
                    aria-expanded={isEmojiPickerOpen}
                  >
                    <Smile size={18} />
                  </button>

                  {isEmojiPickerOpen && (
                    <div
                      ref={emojiPickerRef}
                      className="fixed inset-x-3 bottom-[calc(var(--safe-area-bottom)+84px)] z-50 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-[calc(100%+12px)] sm:right-0 sm:w-[460px] sm:p-3"
                    >
                      <span
                        className="absolute -bottom-2 right-5 hidden h-4 w-4 rotate-45 border-b border-r border-base-300 bg-base-100 sm:block"
                        aria-hidden="true"
                      />
                      <div className="relative mb-2 flex items-center justify-between gap-2 px-1">
                        <p className="text-sm font-semibold text-base-content">Emoji keyboard</p>
                        <button
                          type="button"
                          onClick={() => setIsEmojiPickerOpen(false)}
                          className="rounded-full p-1.5 text-base-content/55 transition hover:bg-base-200 hover:text-base-content"
                          aria-label="Close emoji keyboard"
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <div className="relative overflow-hidden rounded-xl border border-base-300 bg-base-100">
                        <EmojiPicker
                          width="100%"
                          height={300}
                          lazyLoadEmojis
                          searchPlaceholder="Search emoji"
                          skinTonesDisabled={false}
                          previewConfig={{ showPreview: false }}
                          onEmojiClick={handleEmojiClick}
                          style={emojiPickerStyles}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {isRecording ? (
                <button
                  type="button"
                  onClick={finishVoiceRecording}
                  disabled={isSending}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-base-200 disabled:text-base-content/40 sm:h-[52px] sm:w-auto sm:px-5"
                  aria-label="Send voice note"
                >
                  <Square size={18} />
                </button>
              ) : hasDraft || selectedAttachment ? (
                <button
                  type="button"
                  onClick={sendCurrentMessage}
                  disabled={isSending || isSelectedPeerBlocked}
                  className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-medium transition sm:px-5 ${
                    !isSending
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-base-200 text-base-content/40 disabled:cursor-not-allowed"
                  }`}
                >
                  Send
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startVoiceRecording()}
                  disabled={isSending || isSelectedPeerBlocked}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-base-200 text-base-content transition hover:bg-base-300 disabled:cursor-not-allowed disabled:text-base-content/40 sm:h-[52px] sm:w-auto sm:px-5"
                  aria-label="Record voice note"
                >
                  <Mic size={18} />
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <EmptyThread />
      )}
    </section>
  );
}
