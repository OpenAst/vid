"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store/store";
import CallButton from "@/app/components/calls/CallButton";
import { ArrowLeft, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { createRealtimeSocket, type RealtimeSocket } from "@/app/lib/socket";

type UserSummary = {
  id: string;
  username?: string | null;
  first_name?: string;
  last_name?: string;
  profile?: {
    avatar?: string | null;
  };
};

type Message = {
  id: string;
  body: string;
  created_at: string;
  is_own: boolean;
  sender: UserSummary;
};

type Conversation = {
  id: string;
  other_user: UserSummary;
  last_message: Message | null;
  last_message_at: string;
  created_at: string;
};

type RealtimeMessagePayload = {
  conversationId: string;
  toUserId: string;
  message: Message;
  fromUserId: string;
};

const formatStamp = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const peerId = searchParams.get("user");
  const { isAuthenticated, isBootstrapped, token, user } = useSelector((state: RootState) => state.auth);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [people, setPeople] = useState<UserSummary[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [isDesktopView, setIsDesktopView] = useState(false);
  const requestedPeerRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const preventAutoSelectRef = useRef(false);
  const socketRef = useRef<RealtimeSocket | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);

  const syncConversationPreview = useCallback((conversationId: string, message: Message) => {
    setConversations((current) => {
      const existingConversation = current.find((conversation) => conversation.id === conversationId);
      if (!existingConversation) return current;

      const updatedConversation: Conversation = {
        ...existingConversation,
        last_message: message,
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
        last_message_at: message.created_at,
      };
    });
  }, []);

  const upsertConversation = useCallback((conversation: Conversation, message?: Message | null) => {
    const nextConversation: Conversation = {
      ...conversation,
      last_message: message ?? conversation.last_message,
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

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    setConversationError(null);
    try {
      const response = await fetch("/api/messages/conversations", { cache: "no-store" });
      const data = await response.json();
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
      setConversationError(error instanceof Error ? error.message : "Unable to load conversations");
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const loadPeople = useCallback(async () => {
    setIsLoadingPeople(true);
    try {
      const response = await fetch("/api/messages/users", { cache: "no-store" });
      const data = await response.json();
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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load messages");
      }
      setMessages(Array.isArray(data?.results) ? data.results : []);
      if (data?.conversation) {
        setSelectedConversation(data.conversation);
      }
    } catch (error) {
      console.error("Failed to load messages", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const ensureConversationForPeer = useCallback(async (participantId: string) => {
    const response = await fetch("/api/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_id: participantId }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.detail || "Unable to start conversation");
    }

    setSelectedConversationId(data.id);
    setSelectedConversation(data);
    return data as Conversation;
  }, []);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    if (!token || !isAuthenticated) return;

    const socket = createRealtimeSocket(token);
    socketRef.current = socket;

    const handleIncomingMessage = (payload: RealtimeMessagePayload) => {
      const incomingMessage: Message = {
        ...payload.message,
        is_own: payload.fromUserId === user?.id,
      };

      void loadConversations();

      if (payload.conversationId === selectedConversationIdRef.current) {
        setMessages((current) => {
          if (current.some((message) => message.id === incomingMessage.id)) {
            return current;
          }
          return [...current, incomingMessage];
        });
      }
    };

    socket.on("messages:new", handleIncomingMessage);
    socket.connect();

    return () => {
      socket.off("messages:new", handleIncomingMessage);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, loadConversations, token, user?.id]);

  useEffect(() => {
    if (isBootstrapped && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!isAuthenticated) return;
    void loadConversations();
    void loadPeople();
  }, [isAuthenticated, isBootstrapped, loadConversations, loadPeople, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateLayoutMode = () => {
      setIsDesktopView(mediaQuery.matches);
      if (mediaQuery.matches) {
        preventAutoSelectRef.current = false;
      }
    };

    updateLayoutMode();
    mediaQuery.addEventListener("change", updateLayoutMode);
    return () => mediaQuery.removeEventListener("change", updateLayoutMode);
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedPeer = useMemo(() => selectedConversation?.other_user || null, [selectedConversation]);
  const showThreadOnMobile = Boolean(selectedConversationId);
  const hasDraft = draft.trim().length > 0;

  const sendMessage = async () => {
    if (!selectedConversationId || !hasDraft || isSending) return;

    setIsSending(true);
    try {
      const messageBody = draft.trim();
      const response = await fetch(`/api/messages/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageBody }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to send message");
      }

      const nextMessage = data as Message;
      setMessages((current) => [...current, nextMessage]);
      syncConversationPreview(selectedConversationId, nextMessage);
      setDraft("");

      if (selectedConversation) {
        socketRef.current?.emit("messages:send", {
          conversationId: selectedConversationId,
          toUserId: selectedConversation.other_user.id,
          message: nextMessage,
        });
      }
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

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

  if (!isBootstrapped || !isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-base-100">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-base-300" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-base-100 text-base-content md:pl-[100px]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-3 pb-[calc(var(--safe-area-bottom)+12px)] pt-[calc(var(--app-header-height)+12px)] sm:px-4 md:px-6">
        <div className={`mb-3 ${showThreadOnMobile ? "hidden md:block" : ""}`}>
          <h1 className="text-xl font-semibold sm:text-2xl">Messages</h1>
          <p className="mt-1 text-sm text-base-content/60">Talk to people, then call straight from the chat.</p>
          {user?.username && (
            <p className="mt-2 text-xs font-medium text-base-content/45">
              Signed in as @{user.username}
            </p>
          )}
        </div>

        <div className="grid flex-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
          <section className={`overflow-hidden rounded-2xl border border-base-300 bg-base-100 ${showThreadOnMobile ? "hidden md:block" : ""}`}>
            <div className="border-b border-base-300 px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">Inbox</h2>
            </div>
            <div className="max-h-[48dvh] overflow-y-auto md:max-h-[70dvh]">
              {conversationError && (
                <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {conversationError}
                </div>
              )}
              {isLoadingConversations ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-xl bg-base-200" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-sm text-base-content/60">
                  No conversations yet. Start a new chat below or from someone&apos;s profile.
                </div>
              ) : (
                conversations.map((conversation) => {
                  const active = conversation.id === selectedConversationId;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => {
                        setSelectedConversationId(conversation.id);
                        setSelectedConversation(conversation);
                      }}
                      className={`flex w-full items-start gap-3 border-b border-base-200 px-4 py-3 text-left transition-colors ${active ? "bg-base-200/70" : "hover:bg-base-200/40"}`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {(conversation.other_user?.username || "U").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium">
                            {conversation.other_user?.first_name || conversation.other_user?.username || "Unknown"}
                          </p>
                          <span className="shrink-0 text-xs text-base-content/50">
                            {formatStamp(conversation.last_message_at)}
                          </span>
                        </div>
                        <p className="truncate text-sm text-base-content/60">
                          {conversation.last_message?.body || "Say hello"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-base-300 px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-base-content/50">Start New Chat</h3>
            </div>
            <div className="max-h-[30dvh] overflow-y-auto md:max-h-[28dvh]">
              {isLoadingPeople ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-xl bg-base-200" />
                  ))}
                </div>
              ) : people.length === 0 ? (
                <div className="p-4 text-sm text-base-content/60">No people available yet.</div>
              ) : (
                people.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => void startChatWithUser(person)}
                    className="flex w-full items-center gap-3 border-b border-base-200 px-4 py-3 text-left transition-colors hover:bg-base-200/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {(person.username || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {person.first_name || person.username || "Unknown"}
                      </p>
                      <p className="truncate text-sm text-base-content/60">@{person.username || "user"}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className={`flex min-h-[72dvh] flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 md:min-h-[70dvh] ${!showThreadOnMobile ? "hidden md:flex" : ""}`}>
            {selectedPeer ? (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-base-300 px-3 py-3 sm:px-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        preventAutoSelectRef.current = true;
                        setSelectedConversationId(null);
                        setSelectedConversation(null);
                        setMessages([]);
                      }}
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
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <CallButton peer={selectedPeer} type="audio" />
                    <CallButton peer={selectedPeer} type="video" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-base-100 px-3 py-4 sm:px-4">
                  {isLoadingMessages ? (
                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={index}
                          className={`h-12 animate-pulse rounded-2xl ${index % 2 === 0 ? "mr-10 bg-base-200 sm:mr-16" : "ml-10 bg-sky-200 sm:ml-16"}`}
                        />
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-base-content/60">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MessageCircle size={24} />
                      </div>
                      <p className="font-medium text-base-content">No messages yet</p>
                      <p className="mt-1 max-w-xs leading-6">Say hello and start the conversation here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.is_own ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[80%] ${
                              message.is_own
                                ? "bg-sky-600 text-white"
                                : "border border-base-300 bg-base-200 text-base-content"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words leading-6">{message.body}</p>
                            <p className={`mt-1 text-[11px] ${message.is_own ? "text-white/75" : "text-base-content/50"}`}>
                              {formatStamp(message.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="border-t border-base-300 px-3 py-3 pb-[calc(var(--safe-area-bottom)+12px)] sm:px-4">
                  <div className="flex items-end gap-2 sm:gap-3">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                      rows={1}
                      placeholder="Write a message..."
                      className="min-h-[52px] max-h-36 flex-1 resize-none rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={!hasDraft || isSending}
                      className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-medium transition sm:px-5 ${
                        hasDraft && !isSending
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-base-200 text-base-content/40 disabled:cursor-not-allowed"
                      }`}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-base-content/60">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageCircle size={24} />
                </div>
                <p className="font-medium text-base-content">Pick a conversation</p>
                <p className="mt-1 max-w-xs leading-6">Choose a chat from your inbox or start a new one from the people list.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
