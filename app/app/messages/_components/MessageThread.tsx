"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import dynamic from "next/dynamic";
import CallButton from "@/app/components/calls/CallButton";
import UserSafetyActions from "@/app/components/safety/UserSafetyActions";
import { ArrowLeft, CheckCheck, Copy, MessageCircle, Mic, Phone, PhoneMissed, Reply, Smile, Square, Trash2, Video, X } from "lucide-react";
import { formatStamp, getCallLabel, getPresenceMeta } from "../_lib/messageUtils";
import type { Message, MessageReaction, MessageReply, TimelineItem, UserSummary } from "../_lib/types";
import type { EmojiClickData } from "emoji-picker-react";

type MessageThreadProps = {
  draft: string;
  hasDraft: boolean;
  isLoading: boolean;
  isPeerTyping: boolean;
  isSending: boolean;
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
  onReact: (message: Message, reaction: MessageReaction) => void;
  onSendMessage: () => void;
  onSendVoiceNote: (audioBlob: Blob, durationMs: number) => Promise<void> | void;
};

function formatDuration(durationMs?: number) {
  const totalSeconds = Math.max(0, Math.round((durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getReplyLabel(message: Message | MessageReply) {
  return message.message_type === "voice" ? message.audio_transcript || "Voice note" : message.body || "Message";
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
    <div className="flex h-[360px] items-center justify-center rounded-xl bg-base-200 text-sm text-base-content/55">
      Loading emoji keyboard...
    </div>
  ),
});

function EmptyThread() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-base-content/60">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageCircle size={24} />
      </div>
      <p className="font-medium text-base-content">Pick a conversation</p>
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
  onReact,
  onSendMessage,
  onSendVoiceNote,
}: MessageThreadProps) {
  const [blockedPeerIds, setBlockedPeerIds] = useState<Set<string>>(new Set());
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isSelectedPeerBlocked = Boolean(selectedPeer?.id && blockedPeerIds.has(selectedPeer.id));

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
  }, [selectedPeer?.id]);

  const copyMessage = async (message: Message) => {
    if (!message.body || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(message.body);
    setActiveActionMessageId(null);
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
    <section className={`flex min-h-[72dvh] flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 md:min-h-[70dvh] ${!showThreadOnMobile ? "hidden md:flex" : ""}`}>
      {selectedPeer ? (
        <>
          {(() => {
            const presence = getPresenceMeta(selectedPeerOnline);
            return (
              <div className="flex items-start justify-between gap-3 border-b border-base-300 px-3 py-3 sm:px-4">
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    onClick={onBack}
                    className="mt-0.5 rounded-full p-2 text-base-content/70 transition hover:bg-base-200 hover:text-base-content md:hidden"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold sm:text-lg">
                      {selectedPeer.first_name || selectedPeer.username || "Conversation"}
                    </p>
                    <p className="truncate text-sm text-base-content/60">@{selectedPeer.username || "user"}</p>
                    <p className={`mt-0.5 flex items-center gap-1.5 text-xs font-medium ${presence.className}`}>
                      <span className={`h-2 w-2 rounded-full ${presence.dotClassName}`} aria-hidden="true" />
                      {presence.label}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
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

          <div className="flex-1 overflow-y-auto bg-base-100 px-3 py-4 sm:px-4">
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
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-base-content/60">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageCircle size={24} />
                </div>
                <p className="font-medium text-base-content">No messages yet</p>
                <p className="mt-1 max-w-xs leading-6">Say hello and start the conversation here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {timelineItems.map((item) => {
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

                  return (
                    <div
                      key={item.id}
                      className={`flex ${message.is_own ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`group relative flex max-w-[92%] flex-col ${message.is_own ? "items-end" : "items-start"} sm:max-w-[84%]`}>
                      <div
                        onClick={() => setActiveActionMessageId((current) => current === message.id ? null : message.id)}
                        className={`w-fit max-w-full cursor-pointer rounded-xl px-3 py-2 text-sm shadow-sm ${
                          message.is_own
                            ? "bg-green-600 text-white"
                            : "border border-base-300 bg-base-200 text-base-content"
                        }`}
                      >
                        {message.reply_to && (
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
                        {message.message_type === "voice" && message.audio_url ? (
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
                        ) : (
                          <p className="whitespace-pre-wrap break-words leading-5">{message.body}</p>
                        )}
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
                      {message.reaction_counts && Object.entries(message.reaction_counts).some(([, count]) => Number(count) > 0) && (
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
                      {showActions && (
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

          <div className="border-t border-base-300 px-3 py-3 pb-[calc(var(--safe-area-bottom)+12px)] sm:px-4">
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
            <div className="flex items-end gap-2 sm:gap-3">
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
                  className="min-h-[52px] max-h-36 flex-1 resize-none rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              )}
              {!isRecording && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    ref={emojiButtonRef}
                    onClick={() => setIsEmojiPickerOpen((current) => !current)}
                    disabled={isSelectedPeerBlocked}
                    className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-base-300 bg-base-100 text-base-content/70 transition hover:bg-base-200 hover:text-base-content disabled:cursor-not-allowed disabled:text-base-content/35 ${
                      isEmojiPickerOpen ? "border-primary text-primary ring-2 ring-primary/20" : ""
                    }`}
                    aria-label="Open emoji keyboard"
                    aria-expanded={isEmojiPickerOpen}
                  >
                    <Smile size={20} />
                  </button>

                  {isEmojiPickerOpen && (
                    <div
                      ref={emojiPickerRef}
                      className="absolute bottom-[calc(100%+10px)] right-0 z-30 w-[min(82vw,340px)] rounded-2xl border border-base-300 bg-base-100 p-3 shadow-2xl"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-base-content">Emoji</p>
                        <button
                          type="button"
                          onClick={() => setIsEmojiPickerOpen(false)}
                          className="rounded-full p-1.5 text-base-content/55 transition hover:bg-base-200 hover:text-base-content"
                          aria-label="Close emoji keyboard"
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <div className="overflow-hidden rounded-xl">
                        <EmojiPicker
                          width="100%"
                          height={360}
                          lazyLoadEmojis
                          searchPlaceholder="Search emoji"
                          skinTonesDisabled={false}
                          previewConfig={{ showPreview: false }}
                          onEmojiClick={handleEmojiClick}
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
                  className="shrink-0 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-base-200 disabled:text-base-content/40 sm:px-5"
                  aria-label="Send voice note"
                >
                  <Square size={18} />
                </button>
              ) : hasDraft ? (
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
                  className="shrink-0 rounded-2xl bg-base-200 px-4 py-3 text-base-content transition hover:bg-base-300 disabled:cursor-not-allowed disabled:text-base-content/40 sm:px-5"
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
