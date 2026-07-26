"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { createRealtimeSocket, type RealtimeSocket } from "@/app/lib/socket";
import { RootState } from "@/app/store/store";
import { buildTimelineItems } from "../_lib/messageUtils";
import type {
  CallEventPayload,
  CallRecord,
  Conversation,
  Message,
  MessageReadPayload,
  MessageReaction,
  MessageReactionCounts,
  MessageTypingPayload,
  PresenceChangedPayload,
  PresenceSnapshotPayload,
  RealtimeMessageDeletePayload,
  RealtimeMessagePayload,
  RealtimeMessageUpdatePayload,
  UserSummary,
} from "../_lib/types";

async function readJsonResponse(response: Response, fallbackDetail: string) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    console.error("Expected JSON response but received:", text.slice(0, 300));
    return { detail: fallbackDetail };
  }

  try {
    return await response.json();
  } catch (error) {
    console.error("Unable to parse JSON response", error);
    return { detail: fallbackDetail };
  }
}

export function useMessagesController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const peerId = searchParams.get("user");
  const { isAuthenticated, isBootstrapped, token, user } = useSelector((state: RootState) => state.auth);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [people, setPeople] = useState<UserSummary[]>([]);
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingCalls, setIsLoadingCalls] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [isDesktopView, setIsDesktopView] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [typingConversationIds, setTypingConversationIds] = useState<Set<string>>(() => new Set());

  const requestedPeerRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const preventAutoSelectRef = useRef(false);
  const socketRef = useRef<RealtimeSocket | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const selectedConversationIdRef = useRef<string | null>(null);
  const selectedPeerIdRef = useRef<string | null>(null);
  const subscribedPresenceIdsRef = useRef<string[]>([]);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const selectedPeer = useMemo(() => selectedConversation?.other_user || null, [selectedConversation]);
  const selectedPeerOnline = Boolean(selectedPeer && onlineUserIds.has(selectedPeer.id));
  const selectedPeerTyping = Boolean(selectedConversationId && typingConversationIds.has(selectedConversationId));
  const showThreadOnMobile = Boolean(selectedConversationId);
  const hasDraft = draft.trim().length > 0;
  const timelineItems = useMemo(() => buildTimelineItems(messages, callHistory), [callHistory, messages]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const applyReadReceipts = useCallback((conversationId: string, messageIds: string[], readAt: string, clearUnread = false) => {
    const messageIdSet = new Set(messageIds);
    if (messageIdSet.size === 0) return;

    setMessages((current) =>
      current.map((message) =>
        messageIdSet.has(message.id)
          ? { ...message, read_at: message.read_at || readAt }
          : message
      )
    );

    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== conversationId || !conversation.last_message || !messageIdSet.has(conversation.last_message.id)) {
          if (clearUnread && conversation.id === conversationId) {
            return { ...conversation, unread_count: 0 };
          }
          return conversation;
        }

        return {
          ...conversation,
          unread_count: clearUnread ? 0 : conversation.unread_count,
          last_message: {
            ...conversation.last_message,
            read_at: conversation.last_message.read_at || readAt,
          },
        };
      })
    );

    setSelectedConversation((current) => {
      if (!current || current.id !== conversationId || !current.last_message || !messageIdSet.has(current.last_message.id)) {
        return current;
      }

      return {
        ...current,
      unread_count: clearUnread ? 0 : current.unread_count,
        last_message: {
          ...current.last_message,
          read_at: current.last_message.read_at || readAt,
        },
      };
    });
  }, []);

  const clearConversationUnread = useCallback((conversationId: string) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unread_count: 0 }
          : conversation
      )
    );

    setSelectedConversation((current) =>
      current?.id === conversationId
        ? { ...current, unread_count: 0 }
        : current
    );
  }, []);

  const emitReadReceipt = useCallback((conversationId: string, toUserId: string, messageIds: string[], readAt: string) => {
    if (messageIds.length === 0) return;
    socketRef.current?.emit("messages:read", {
      conversationId,
      toUserId,
      messageIds,
      readAt,
    });
  }, []);

  const emitTypingState = useCallback((isTyping: boolean) => {
    const conversationId = selectedConversationIdRef.current;
    const toUserId = selectedPeerIdRef.current;
    if (!conversationId || !toUserId) return;

    socketRef.current?.emit("messages:typing", {
      conversationId,
      toUserId,
      isTyping,
    });
  }, []);

  const stopTypingSoon = useCallback(() => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = setTimeout(() => {
      emitTypingState(false);
      typingStopTimerRef.current = null;
    }, 1400);
  }, [emitTypingState]);

  const updateDraft = useCallback((value: string) => {
    setDraft(value);

    if (value.trim()) {
      emitTypingState(true);
      stopTypingSoon();
      return;
    }

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    emitTypingState(false);
  }, [emitTypingState, stopTypingSoon]);

  const markMessagesRead = useCallback(async (conversationId: string, toUserId: string, messageIds: string[]) => {
    if (messageIds.length === 0) return;

    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_ids: messageIds }),
      });
      const data = await readJsonResponse(response, "Unable to mark messages read");
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to mark messages read");
      }

      const readMessageIds = Array.isArray(data?.read_message_ids) ? data.read_message_ids : [];
      const readAt = data?.read_at || new Date().toISOString();
      if (readMessageIds.length > 0) {
        applyReadReceipts(conversationId, readMessageIds, readAt, true);
        emitReadReceipt(conversationId, toUserId, readMessageIds, readAt);
      }
    } catch (error) {
      console.error("Failed to mark messages read", error);
    }
  }, [applyReadReceipts, emitReadReceipt]);

  const syncConversationPreview = useCallback((conversationId: string, message: Message) => {
    setConversations((current) => {
      const existingConversation = current.find((conversation) => conversation.id === conversationId);
      if (!existingConversation) return current;

      const updatedConversation: Conversation = {
        ...existingConversation,
        last_message: message,
        last_activity_at: message.created_at,
        last_message_at: message.created_at,
      };

      return [
        updatedConversation,
        ...current.filter((conversation) => conversation.id !== conversationId),
      ];
    });

    setSelectedConversation((current) => {
      if (!current || current.id !== conversationId) return current;

      return {
        ...current,
        last_message: message,
        last_activity_at: message.created_at,
        last_message_at: message.created_at,
      };
    });
  }, []);

  const upsertConversation = useCallback((conversation: Conversation, message?: Message | null) => {
    const nextConversation: Conversation = {
      ...conversation,
      last_message: message ?? conversation.last_message,
      last_activity_at: message?.created_at ?? conversation.last_activity_at,
      last_message_at: message?.created_at ?? conversation.last_message_at,
    };

    setConversations((current) => [
      nextConversation,
      ...current.filter((item) => item.id !== nextConversation.id),
    ]);

    setSelectedConversation((current) => {
      if (current?.id !== nextConversation.id) return current;
      return nextConversation;
    });
  }, []);

  const loadConversations = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setIsLoadingConversations(true);
    }
    setConversationError(null);
    try {
      const response = await fetch("/api/messages/conversations", { cache: "no-store" });
      const data = await readJsonResponse(response, "Unable to load conversations");
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load conversations");
      }

      const nextConversations = Array.isArray(data?.results) ? data.results : [];
      setConversations(nextConversations);
      setSelectedConversation((current) => {
        if (!current) return current;
        return nextConversations.find((conversation: Conversation) => conversation.id === current.id) || current;
      });
    } catch (error) {
      console.error("Failed to load conversations", error);
      if (!silent) {
        setConversationError(error instanceof Error ? error.message : "Unable to load conversations");
      }
    } finally {
      if (!silent) {
        setIsLoadingConversations(false);
      }
    }
  }, []);

  const loadPeople = useCallback(async (search: string) => {
    const normalizedSearch = search.trim();
    if (normalizedSearch.length < 2) {
      setPeople([]);
      setIsLoadingPeople(false);
      return;
    }

    setIsLoadingPeople(true);
    try {
      const response = await fetch(`/api/messages/users?search=${encodeURIComponent(normalizedSearch)}`, { cache: "no-store" });
      const data = await readJsonResponse(response, "Unable to load people");
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load people");
      }
      setPeople(Array.isArray(data?.results) ? data.results : []);
    } catch (error) {
      console.error("Failed to load people", error);
    } finally {
      setIsLoadingPeople(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, { cache: "no-store" });
      const data = await readJsonResponse(response, "Unable to load messages");
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load messages");
      }
      setMessages(Array.isArray(data?.results) ? data.results : []);
      if (data?.conversation) {
        setSelectedConversation(data.conversation);
      }
      const readMessageIds = Array.isArray(data?.read_message_ids) ? data.read_message_ids : [];
      if (readMessageIds.length > 0 && data?.conversation?.other_user?.id && data?.read_at) {
        clearConversationUnread(conversationId);
        emitReadReceipt(conversationId, data.conversation.other_user.id, readMessageIds, data.read_at);
      }
    } catch (error) {
      console.error("Failed to load messages", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [clearConversationUnread, emitReadReceipt]);

  const loadCallHistory = useCallback(async (nextPeerId: string) => {
    setIsLoadingCalls(true);
    try {
      const response = await fetch(`/api/calls/history?peer_id=${nextPeerId}`, { cache: "no-store" });
      const data = await readJsonResponse(response, "Unable to load call history");
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load call history");
      }
      setCallHistory(Array.isArray(data?.results) ? data.results : []);
    } catch (error) {
      console.error("Failed to load call history", error);
      setCallHistory([]);
    } finally {
      setIsLoadingCalls(false);
    }
  }, []);

  const ensureConversationForPeer = useCallback(async (participantId: string) => {
    const response = await fetch("/api/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_id: participantId }),
    });
    const data = await readJsonResponse(response, "Unable to start conversation");
    if (!response.ok) {
      throw new Error(data?.detail || "Unable to start conversation");
    }

    setSelectedConversationId(data.id);
    setSelectedConversation(data);
    return data as Conversation;
  }, []);

  const selectConversation = useCallback((conversation: Conversation) => {
    emitTypingState(false);
    setSelectedConversationId(conversation.id);
    setSelectedConversation({ ...conversation, unread_count: 0 });
    setReplyingTo(null);
    clearConversationUnread(conversation.id);
    setCallHistory([]);
    setTypingConversationIds((current) => {
      if (!current.has(conversation.id)) return current;
      const next = new Set(current);
      next.delete(conversation.id);
      return next;
    });
  }, [clearConversationUnread, emitTypingState]);

  const closeThreadOnMobile = useCallback(() => {
    emitTypingState(false);
    preventAutoSelectRef.current = true;
    setSelectedConversationId(null);
    setSelectedConversation(null);
    setMessages([]);
    setCallHistory([]);
    setReplyingTo(null);
  }, [emitTypingState]);

  const sendMessage = useCallback(async () => {
    if (!selectedConversationId || (!hasDraft && !selectedAttachment) || isSending) return;

    setIsSending(true);
    setSendError(null);
    try {
      const messageBody = draft.trim();
      let attachmentPayload = {};

      if (selectedAttachment) {
        const fileType = selectedAttachment.type || "application/octet-stream";
        const presignResponse = await fetch("/api/messages/attachment-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_type: fileType,
            file_name: selectedAttachment.name,
            file_size: selectedAttachment.size,
          }),
        });
        const presignData = await presignResponse.json().catch(() => null);
        if (!presignResponse.ok || !presignData?.upload_url || !presignData?.attachment_url) {
          throw new Error(presignData?.detail || "Unable to prepare attachment");
        }

        const uploadResponse = await fetch(presignData.upload_url, {
          method: "PUT",
          headers: { "Content-Type": fileType },
          body: selectedAttachment,
        });
        if (!uploadResponse.ok) {
          throw new Error("Unable to upload attachment");
        }

        attachmentPayload = {
          message_type: fileType.startsWith("image/") ? "image" : "file",
          attachment_url: presignData.attachment_url,
          attachment_name: selectedAttachment.name,
          attachment_type: fileType,
          attachment_size: selectedAttachment.size,
        };
      }

      const response = await fetch(`/api/messages/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageBody, reply_to_id: replyingTo?.id || null, ...attachmentPayload }),
      });
      const data = await readJsonResponse(response, "Unable to send message");
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to send message");
      }

      const nextMessage = data as Message;
      setMessages((current) => [...current, nextMessage]);
      syncConversationPreview(selectedConversationId, nextMessage);
      setDraft("");
      setSelectedAttachment(null);
      setReplyingTo(null);
      emitTypingState(false);

      if (selectedConversation) {
        socketRef.current?.emit("messages:send", {
          conversationId: selectedConversationId,
          toUserId: selectedConversation.other_user.id,
          message: nextMessage,
        });
      }
    } catch (error) {
      console.error("Failed to send message", error);
      setSendError(error instanceof Error ? error.message : "Unable to send message");
    } finally {
      setIsSending(false);
    }
  }, [draft, emitTypingState, hasDraft, isSending, replyingTo?.id, selectedAttachment, selectedConversation, selectedConversationId, syncConversationPreview]);

  const sendVoiceNote = useCallback(async (audioBlob: Blob, durationMs: number) => {
    if (!selectedConversationId || isSending) return;

    setIsSending(true);
    try {
      const fileType = audioBlob.type || "audio/webm";
      const presignResponse = await fetch("/api/messages/voice-note-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_type: fileType }),
      });
      const presignData = await presignResponse.json().catch(() => null);
      if (!presignResponse.ok || !presignData?.upload_url || !presignData?.audio_url) {
        throw new Error(presignData?.detail || "Unable to prepare voice note");
      }

      const uploadResponse = await fetch(presignData.upload_url, {
        method: "PUT",
        headers: { "Content-Type": fileType },
        body: audioBlob,
      });
      if (!uploadResponse.ok) {
        throw new Error("Unable to upload voice note");
      }

      const response = await fetch(`/api/messages/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: "",
            message_type: "voice",
            audio_url: presignData.audio_url,
            audio_duration_ms: Math.max(0, Math.round(durationMs)),
            reply_to_id: replyingTo?.id || null,
          }),
      });
      const data = await readJsonResponse(response, "Unable to send voice note");
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to send voice note");
      }

      const nextMessage = data as Message;
      setMessages((current) => [...current, nextMessage]);
      syncConversationPreview(selectedConversationId, nextMessage);
      setReplyingTo(null);
      emitTypingState(false);

      if (selectedConversation) {
        socketRef.current?.emit("messages:send", {
          conversationId: selectedConversationId,
          toUserId: selectedConversation.other_user.id,
          message: nextMessage,
        });
      }
    } catch (error) {
      console.error("Failed to send voice note", error);
      toast.error(error instanceof Error ? error.message : "Unable to send voice note");
    } finally {
      setIsSending(false);
    }
  }, [emitTypingState, isSending, replyingTo?.id, selectedConversation, selectedConversationId, syncConversationPreview]);

  const applyMessageReaction = useCallback((messageId: string, reactionCounts: MessageReactionCounts, myReaction: MessageReaction | null) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? { ...message, reaction_counts: reactionCounts, my_reaction: myReaction }
          : message
      )
    );
  }, []);

  const reactToMessage = useCallback(async (message: Message, reaction: MessageReaction) => {
    if (!selectedConversationId) return;

    const previousCounts = message.reaction_counts || {};
    const previousReaction = message.my_reaction || null;
    const nextCounts: MessageReactionCounts = { ...previousCounts };

    if (previousReaction) {
      nextCounts[previousReaction] = Math.max(0, (nextCounts[previousReaction] || 0) - 1);
    }
    const nextReaction = previousReaction === reaction ? null : reaction;
    if (nextReaction) {
      nextCounts[nextReaction] = (nextCounts[nextReaction] || 0) + 1;
    }

    applyMessageReaction(message.id, nextCounts, nextReaction);

    try {
      const response = await fetch(`/api/messages/conversations/${selectedConversationId}/messages/${message.id}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });
      const data = await readJsonResponse(response, "Unable to update reaction");
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to update reaction");
      }
      applyMessageReaction(message.id, data.reaction_counts || {}, data.my_reaction || null);
    } catch (error) {
      applyMessageReaction(message.id, previousCounts, previousReaction);
      console.error("Failed to react to message", error);
      toast.error(error instanceof Error ? error.message : "Unable to update reaction");
    }
  }, [applyMessageReaction, selectedConversationId]);

  const deleteMessageForMe = useCallback(async (message: Message) => {
    if (!selectedConversationId) return;

    const previousMessages = messages;
    setMessages((current) => current.filter((item) => item.id !== message.id));

    try {
      const response = await fetch(`/api/messages/conversations/${selectedConversationId}/messages/${message.id}/visibility`, {
        method: "DELETE",
      });
      const data = await readJsonResponse(response, "Unable to delete message");
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to delete message");
      }
      void loadConversations();
    } catch (error) {
      setMessages(previousMessages);
      console.error("Failed to delete message for current user", error);
      throw error;
    }
  }, [loadConversations, messages, selectedConversationId]);

  const undoDeleteMessageForMe = useCallback(async (message: Message) => {
    if (!selectedConversationId) return;

    const response = await fetch(`/api/messages/conversations/${selectedConversationId}/messages/${message.id}/visibility`, {
      method: "POST",
    });
    const data = await readJsonResponse(response, "Unable to restore message");
    if (!response.ok) {
      throw new Error(data?.detail || "Unable to restore message");
    }

    const restoredMessage = data as Message;
    setMessages((current) => {
      if (current.some((item) => item.id === restoredMessage.id)) return current;
      return [...current, restoredMessage].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
    void loadConversations();
  }, [loadConversations, selectedConversationId]);

  const applyDeletedForEveryone = useCallback((conversationId: string, deletedMessage: Message) => {
    setMessages((current) =>
      current.map((message) => message.id === deletedMessage.id ? { ...message, ...deletedMessage } : message)
    );

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId && conversation.last_message?.id === deletedMessage.id
          ? { ...conversation, last_message: { ...conversation.last_message, ...deletedMessage } }
          : conversation
      )
    );

    setSelectedConversation((current) =>
      current?.id === conversationId && current.last_message?.id === deletedMessage.id
        ? { ...current, last_message: { ...current.last_message, ...deletedMessage } }
        : current
    );
  }, []);

  const applyMessageUpdate = useCallback((conversationId: string, updatedMessage: RealtimeMessageUpdatePayload["message"]) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === updatedMessage.id
          ? { ...message, ...updatedMessage }
          : message
      )
    );

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId && conversation.last_message?.id === updatedMessage.id
          ? { ...conversation, last_message: { ...conversation.last_message, ...updatedMessage } }
          : conversation
      )
    );

    setSelectedConversation((current) =>
      current?.id === conversationId && current.last_message?.id === updatedMessage.id
        ? { ...current, last_message: { ...current.last_message, ...updatedMessage } }
        : current
    );
  }, []);

  const deleteMessageForEveryone = useCallback(async (message: Message) => {
    if (!selectedConversationId) return;

    const previousMessages = messages;
    const previousConversation = selectedConversation;
    const optimisticDeletedMessage: Message = {
      ...message,
      body: "",
      message_type: "text",
      audio_url: null,
      audio_duration_ms: 0,
      audio_transcript: "",
      attachment_url: null,
      attachment_name: "",
      attachment_type: "",
      attachment_size: 0,
      reply_to: null,
      reaction_counts: {},
      my_reaction: null,
      is_deleted_for_everyone: true,
      deleted_for_everyone_at: new Date().toISOString(),
    };

    applyDeletedForEveryone(selectedConversationId, optimisticDeletedMessage);

    try {
      const response = await fetch(`/api/messages/conversations/${selectedConversationId}/messages/${message.id}/visibility`, {
        method: "PATCH",
      });
      const data = await readJsonResponse(response, "Unable to delete message for everyone");
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to delete message for everyone");
      }

      const deletedMessage = data as Message;
      applyDeletedForEveryone(selectedConversationId, deletedMessage);

      if (selectedConversation) {
        socketRef.current?.emit("messages:delete", {
          conversationId: selectedConversationId,
          toUserId: selectedConversation.other_user.id,
          message: deletedMessage,
        });
      }
    } catch (error) {
      setMessages(previousMessages);
      setSelectedConversation(previousConversation);
      void loadConversations();
      console.error("Failed to delete message for everyone", error);
      throw error;
    }
  }, [applyDeletedForEveryone, loadConversations, messages, selectedConversation, selectedConversationId]);

  const startChatWithUser = useCallback(async (person: UserSummary) => {
    if (user?.id && person.id === user.id) {
      setConversationError("You can't message yourself.");
      toast.error("You can't message yourself.");
      return;
    }

    try {
      const conversation = await ensureConversationForPeer(person.id);
      upsertConversation(conversation);
      preventAutoSelectRef.current = false;
      await loadMessages(conversation.id);
    } catch (error) {
      console.error("Failed to start chat", error);
      setConversationError(error instanceof Error ? error.message : "Unable to start conversation");
    }
  }, [ensureConversationForPeer, loadMessages, upsertConversation, user?.id]);

  const selectAttachment = useCallback((file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      setSendError("Attachments must be 15MB or smaller.");
      toast.error("Attachments must be 15MB or smaller.");
      return;
    }

    setSelectedAttachment(file);
    setSendError(null);
  }, []);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    selectedPeerIdRef.current = selectedConversation?.other_user.id || null;
  }, [selectedConversation?.other_user.id]);

  useEffect(() => {
    if (!token || !isAuthenticated) return;

    const socket = createRealtimeSocket(token);
    socketRef.current = socket;

    const handleIncomingMessage = (payload: RealtimeMessagePayload) => {
      const incomingMessage: Message = {
        ...payload.message,
        is_own: payload.fromUserId === user?.id,
      };
      const isSelectedConversation = payload.conversationId === selectedConversationIdRef.current;
      const existingConversation = conversationsRef.current.find((conversation) => conversation.id === payload.conversationId);


      if (existingConversation) {
        setConversations((current) => {
          const conversation = current.find((item) => item.id === payload.conversationId);
          if (!conversation) return current;

          const updatedConversation: Conversation = {
            ...conversation,
            last_message: incomingMessage,
            last_activity_at: incomingMessage.created_at,
            last_message_at: incomingMessage.created_at,
            unread_count:
              isSelectedConversation || incomingMessage.is_own
                ? 0
                : (conversation.unread_count || 0) + 1,
          };

          return [
            updatedConversation,
            ...current.filter((item) => item.id !== payload.conversationId),
          ];
        });

        setSelectedConversation((current) => {
          if (!current || current.id !== payload.conversationId) return current;
          return {
            ...current,
            last_message: incomingMessage,
            last_activity_at: incomingMessage.created_at,
            last_message_at: incomingMessage.created_at,
            unread_count: isSelectedConversation ? 0 : current.unread_count,
          };
        });
      } else {
        void loadConversations({ silent: true });
      }

      if (isSelectedConversation) {
        clearConversationUnread(payload.conversationId);
        setTypingConversationIds((current) => {
          if (!current.has(payload.conversationId)) return current;
          const next = new Set(current);
          next.delete(payload.conversationId);
          return next;
        });

        setMessages((current) => {
          if (current.some((message) => message.id === incomingMessage.id)) {
            return current;
          }
          return [...current, incomingMessage];
        });

        if (!incomingMessage.is_own && !incomingMessage.read_at) {
          void markMessagesRead(payload.conversationId, payload.fromUserId, [incomingMessage.id]);
        }
      }
    };

    const handleMessageRead = (payload: MessageReadPayload) => {
      applyReadReceipts(payload.conversationId, payload.messageIds, payload.readAt);
    };

    const handleMessageDeleted = (payload: RealtimeMessageDeletePayload) => {
      if (payload.fromUserId === user?.id) return;
      applyDeletedForEveryone(payload.conversationId, payload.message);
      void loadConversations({ silent: true });
    };

    const handleMessageUpdated = (payload: RealtimeMessageUpdatePayload) => {
      applyMessageUpdate(payload.conversationId, payload.message);
    };

    const handleMessageTyping = (payload: MessageTypingPayload) => {
      if (payload.fromUserId === user?.id) return;

      setTypingConversationIds((current) => {
        const next = new Set(current);
        if (payload.isTyping) {
          next.add(payload.conversationId);
        } else {
          next.delete(payload.conversationId);
        }
        return next;
      });

      const existingTimer = peerTypingTimersRef.current.get(payload.conversationId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        peerTypingTimersRef.current.delete(payload.conversationId);
      }

      if (payload.isTyping) {
        const timer = setTimeout(() => {
          setTypingConversationIds((current) => {
            if (!current.has(payload.conversationId)) return current;
            const next = new Set(current);
            next.delete(payload.conversationId);
            return next;
          });
          peerTypingTimersRef.current.delete(payload.conversationId);
        }, 3500);
        peerTypingTimersRef.current.set(payload.conversationId, timer);
      }
    };

    const handlePresenceSnapshot = (payload: PresenceSnapshotPayload) => {
      const subscribedIds = new Set(subscribedPresenceIdsRef.current);
      const onlineIds = new Set(payload.onlineUserIds);

      setOnlineUserIds((current) => {
        const next = new Set(current);
        subscribedIds.forEach((userId) => {
          if (onlineIds.has(userId)) {
            next.add(userId);
          } else {
            next.delete(userId);
          }
        });
        return next;
      });
    };

    const handlePresenceChanged = (payload: PresenceChangedPayload) => {
      setOnlineUserIds((current) => {
        const next = new Set(current);
        if (payload.isOnline) {
          next.add(payload.userId);
        } else {
          next.delete(payload.userId);
        }
        return next;
      });
    };

    const handleCallEvent = (payload: CallEventPayload) => {
      void loadConversations({ silent: true });

      const activePeerId = selectedPeerIdRef.current;
      const eventPeerId = payload.actor?.id || payload.peerId;
      if (activePeerId && eventPeerId === activePeerId) {
        void loadCallHistory(activePeerId);
      }
    };

    const handleConnect = () => {
      const userIds = subscribedPresenceIdsRef.current;
      if (userIds.length > 0) {
        socket.emit("presence:subscribe", { userIds });
      }
    };

    socket.on("connect", handleConnect);
    socket.on("messages:new", handleIncomingMessage);
    socket.on("messages:read", handleMessageRead);
    socket.on("messages:delete", handleMessageDeleted);
    socket.on("messages:update", handleMessageUpdated);
    socket.on("messages:typing", handleMessageTyping);
    socket.on("presence:snapshot", handlePresenceSnapshot);
    socket.on("presence:changed", handlePresenceChanged);
    socket.on("call:accepted", handleCallEvent);
    socket.on("call:rejected", handleCallEvent);
    socket.on("call:missed", handleCallEvent);
    socket.on("call:ended", handleCallEvent);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("messages:new", handleIncomingMessage);
      socket.off("messages:read", handleMessageRead);
      socket.off("messages:delete", handleMessageDeleted);
      socket.off("messages:update", handleMessageUpdated);
      socket.off("messages:typing", handleMessageTyping);
      socket.off("presence:snapshot", handlePresenceSnapshot);
      socket.off("presence:changed", handlePresenceChanged);
      socket.off("call:accepted", handleCallEvent);
      socket.off("call:rejected", handleCallEvent);
      socket.off("call:missed", handleCallEvent);
      socket.off("call:ended", handleCallEvent);
      socket.disconnect();
      socketRef.current = null;
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      peerTypingTimersRef.current.forEach((timer) => clearTimeout(timer));
      peerTypingTimersRef.current.clear();
    };
  }, [applyDeletedForEveryone, applyMessageUpdate, applyReadReceipts, clearConversationUnread, isAuthenticated, loadCallHistory, loadConversations, markMessagesRead, token, user?.id]);

  useEffect(() => {
    if (!selectedPeer?.id) {
      setCallHistory([]);
      return;
    }

    void loadCallHistory(selectedPeer.id);
  }, [loadCallHistory, selectedPeer?.id]);

  const presenceUserIds = useMemo(() => {
    const ids = new Set<string>();
    conversations.forEach((conversation) => ids.add(conversation.other_user.id));
    people.forEach((person) => ids.add(person.id));
    if (selectedPeer?.id) ids.add(selectedPeer.id);
    if (user?.id) ids.delete(user.id);
    return [...ids];
  }, [conversations, people, selectedPeer?.id, user?.id]);

  useEffect(() => {
    subscribedPresenceIdsRef.current = presenceUserIds;
    if (!socketRef.current?.connected || presenceUserIds.length === 0) return;

    socketRef.current.emit("presence:subscribe", {
      userIds: presenceUserIds,
    });
  }, [presenceUserIds]);

  useEffect(() => {
    if (isBootstrapped && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!isAuthenticated) return;
    void loadConversations();
  }, [isAuthenticated, isBootstrapped, loadConversations, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = window.setTimeout(() => {
      void loadPeople(conversationSearch);
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [conversationSearch, isAuthenticated, loadPeople]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateLayoutMode = () => {
      setIsDesktopView(mediaQuery.matches);
      if (mediaQuery.matches) {
        preventAutoSelectRef.current = false;
      }
    };

    updateLayoutMode();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateLayoutMode);
      return () => mediaQuery.removeEventListener("change", updateLayoutMode);
    }

    mediaQuery.addListener(updateLayoutMode);
    return () => mediaQuery.removeListener(updateLayoutMode);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !peerId || requestedPeerRef.current === peerId) return;

    if (user?.id && peerId === user.id) {
      requestedPeerRef.current = peerId;
      setConversationError("You can't message yourself.");
      toast.error("You can't message yourself.");
      router.replace("/messages");
      return;
    }

    requestedPeerRef.current = peerId;
    void ensureConversationForPeer(peerId)
      .then((conversation) => {
        upsertConversation(conversation);
        return loadMessages(conversation.id);
      })
      .catch((error) => {
        console.error("Failed to start conversation", error);
        setConversationError(error instanceof Error ? error.message : "Unable to start conversation");
      });
  }, [ensureConversationForPeer, isAuthenticated, loadMessages, peerId, router, upsertConversation, user?.id]);

  useEffect(() => {
    if (selectedConversationId) {
      void loadMessages(selectedConversationId);
    }
  }, [loadMessages, selectedConversationId]);

  useEffect(() => {
    if (preventAutoSelectRef.current && !isDesktopView) {
      return;
    }

    if (!selectedConversationId && conversations.length > 0 && (isDesktopView || !preventAutoSelectRef.current)) {
      setSelectedConversationId(conversations[0].id);
      setSelectedConversation(conversations[0]);
    }
  }, [conversations, isDesktopView, selectedConversationId]);

  useEffect(() => {
    const node = messagesEndRef.current;
    if (!node) return;

    try {
      node.scrollIntoView({ behavior: "smooth", block: "end" });
    } catch {
      node.scrollIntoView();
    }
  }, [callHistory, messages]);

  return {
    callHistory,
    conversationError,
    conversationSearch,
    conversations,
    draft,
    hasDraft,
    isAuthenticated,
    isBootstrapped,
    isLoadingCalls,
    isLoadingConversations,
    isLoadingMessages,
    isLoadingPeople,
    isSending,
    sendError,
    selectedAttachment,
    messagesEndRef,
    onlineUserIds,
    people,
    replyingTo,
    selectedConversationId,
    selectedPeer,
    selectedPeerOnline,
    selectedPeerTyping,
    showThreadOnMobile,
    timelineItems,
    user,
    closeThreadOnMobile,
    clearAttachment: () => setSelectedAttachment(null),
    selectConversation,
    selectAttachment,
    sendMessage,
    sendVoiceNote,
    reactToMessage,
    deleteMessageForMe,
    deleteMessageForEveryone,
    undoDeleteMessageForMe,
    setConversationSearch,
    setDraft: updateDraft,
    setReplyingTo,
    startChatWithUser,
  };
}
