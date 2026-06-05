"use client";

import UserAvatar from "@/app/components/common/UserAvatar";
import { MessageCircle, Phone, PhoneMissed, Search, Video, X } from "lucide-react";
import { formatStamp, getConversationPreview, getPresenceMeta } from "../_lib/messageUtils";
import type { Conversation, UserSummary } from "../_lib/types";

type MessagesInboxProps = {
  conversationSearch: string;
  conversations: Conversation[];
  conversationError: string | null;
  currentUserId?: string;
  isLoadingConversations: boolean;
  isLoadingPeople: boolean;
  onlineUserIds: Set<string>;
  people: UserSummary[];
  selectedConversationId: string | null;
  showThreadOnMobile: boolean;
  onConversationSearchChange: (value: string) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onStartChat: (person: UserSummary) => void;
};

export default function MessagesInbox({
  conversationSearch,
  conversations,
  conversationError,
  currentUserId,
  isLoadingConversations,
  isLoadingPeople,
  onlineUserIds,
  people,
  selectedConversationId,
  showThreadOnMobile,
  onConversationSearchChange,
  onSelectConversation,
  onStartChat,
}: MessagesInboxProps) {
  const normalizedSearch = conversationSearch.trim().toLowerCase();
  const matchesUser = (person: UserSummary) => {
    if (!normalizedSearch) return true;
    return [
      person.first_name,
      person.last_name,
      person.username,
      person.profile?.skill_tags,
    ].some((value) => value?.toLowerCase().includes(normalizedSearch));
  };
  const filteredConversations = normalizedSearch
    ? conversations.filter((conversation) => {
        return matchesUser(conversation.other_user);
      })
    : conversations;
  const filteredPeople = normalizedSearch ? people.filter(matchesUser) : people;
  const showPeopleResults = normalizedSearch.length >= 2 || (!normalizedSearch && conversations.length === 0);

  return (
    <section className={`min-h-0 flex-col overflow-hidden border-base-300 bg-base-100 md:flex md:border-r ${showThreadOnMobile ? "hidden md:flex" : "flex"}`}>
      <div className="space-y-3 border-b border-base-300 px-4 py-4 sm:px-5">
        <div>
          <h1 className="pl-12 text-2xl font-bold tracking-tight text-base-content md:pl-0">Messages</h1>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-base-300 bg-base-100 px-3 py-2.5 text-base-content/70 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search size={16} aria-hidden="true" />
          <input
            value={conversationSearch}
            onChange={(event) => onConversationSearchChange(event.target.value)}
            type="search"
            placeholder="Search people or open a recent chat"
            className="min-w-0 flex-1 bg-transparent text-sm text-base-content outline-none placeholder:text-base-content/40"
          />
          {conversationSearch && (
            <button
              type="button"
              onClick={() => onConversationSearchChange("")}
              className="rounded-full p-1 text-base-content/65 transition hover:bg-base-200 hover:text-base-content"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
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
          <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center text-sm font-medium text-base-content/70">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle size={22} />
            </div>
            <p className="font-semibold text-base-content">No conversations yet</p>
            <p className="mt-2 max-w-xs leading-6">
              Search for someone by name or username to start your first chat.
            </p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-sm font-medium text-base-content/70">No users found in your conversations.</div>
        ) : (
          filteredConversations.map((conversation) => {
            const active = conversation.id === selectedConversationId;
            const isOnline = onlineUserIds.has(conversation.other_user.id);
            const unreadCount = conversation.unread_count || 0;
            const hasUnread = unreadCount > 0;
            const presence = getPresenceMeta(isOnline);
            const preview = getConversationPreview(conversation, currentUserId);

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelectConversation(conversation)}
                className={`flex w-full items-start gap-3 border-b border-base-200 px-4 py-3 text-left transition-colors ${active ? "bg-base-200/70" : hasUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-base-200/40"}`}
              >
                <UserAvatar user={conversation.other_user} size={44} showPresence isOnline={isOnline} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate ${hasUnread ? "font-semibold text-base-content" : "font-medium"}`}>
                      {conversation.other_user?.first_name || conversation.other_user?.username || "Unknown"}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`text-xs ${hasUnread ? "font-semibold text-primary" : "font-medium text-base-content/70"}`}>
                        {formatStamp(preview.timestamp)}
                      </span>
                      {hasUnread && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-none text-primary-content">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`flex items-center gap-1.5 truncate text-sm ${preview.isMissed ? "font-medium text-rose-600" : hasUnread ? "font-semibold text-base-content" : "font-medium text-base-content/70"}`}>
                    {preview.isCall && (
                      conversation.last_call?.call_type === "video"
                        ? <Video size={13} aria-hidden="true" />
                        : conversation.last_call?.status === "missed"
                          ? <PhoneMissed size={13} aria-hidden="true" />
                          : <Phone size={13} aria-hidden="true" />
                    )}
                    <span className="truncate">{preview.label}</span>
                  </p>
                  <p className={`mt-1 flex items-center gap-1.5 text-xs ${presence.className}`}>
                    <span className={`h-2 w-2 rounded-full ${presence.dotClassName}`} aria-hidden="true" />
                    {presence.label}
                  </p>
                </div>
              </button>
            );
          })
        )}

        {showPeopleResults && (
          <div className="border-t border-base-300">
            <div className="px-4 pb-1 pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-base-content/45">
                {normalizedSearch ? "People" : "People to message"}
              </p>
            </div>
            {isLoadingPeople ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-xl bg-base-200" />
                ))}
              </div>
            ) : filteredPeople.length === 0 ? (
              <div className="p-4 text-sm font-medium text-base-content/70">
                {normalizedSearch ? "No people match that search." : "No people suggestions yet."}
              </div>
            ) : (
              filteredPeople.map((person) => {
                const isOnline = onlineUserIds.has(person.id);
                const presence = getPresenceMeta(isOnline);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => onStartChat(person)}
                    className="flex w-full items-center gap-3 border-b border-base-200 px-4 py-3 text-left transition-colors hover:bg-base-200/40"
                  >
                    <UserAvatar user={person} size={40} showPresence isOnline={isOnline} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {person.first_name || person.username || "Unknown"}
                      </p>
                      <p className="truncate text-sm font-medium text-base-content/70">@{person.username || "user"}</p>
                      <p className={`mt-0.5 flex items-center gap-1.5 text-xs ${presence.className}`}>
                        <span className={`h-2 w-2 rounded-full ${presence.dotClassName}`} aria-hidden="true" />
                        {presence.label}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </section>
  );
}
