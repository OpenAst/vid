"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import MessagesInbox from "./_components/MessagesInbox";
import MessageThread from "./_components/MessageThread";
import { useMessagesController } from "./_hooks/useMessagesController";

function MessagesLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-base-100">
      <div className="h-10 w-10 animate-pulse rounded-2xl bg-base-300" aria-hidden="true" />
    </div>
  );
}

function MessagesPageContent() {
  const controller = useMessagesController();

  if (!controller.isBootstrapped || !controller.isAuthenticated) {
    return <MessagesLoading />;
  }

  return (
    <div className="min-h-[100dvh] bg-base-100 text-base-content md:pl-[100px]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-3 pb-[calc(var(--safe-area-bottom)+12px)] pt-[calc(var(--app-header-height)+12px)] sm:px-4 md:px-6">
        <div className={`mb-3 ${controller.showThreadOnMobile ? "hidden md:block" : ""}`}>
          <h1 className="text-xl font-semibold sm:text-2xl">Messages</h1>
          <p className="mt-1 text-sm text-base-content/60">Talk to people, then call straight from the chat.</p>
          {controller.user?.username && (
            <p className="mt-2 text-xs font-medium text-base-content/45">
              Signed in as @{controller.user.username}
            </p>
          )}
        </div>

        <div className="grid flex-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
          <MessagesInbox
            conversationSearch={controller.conversationSearch}
            conversations={controller.conversations}
            conversationError={controller.conversationError}
            currentUserId={controller.user?.id}
            isLoadingConversations={controller.isLoadingConversations}
            isLoadingPeople={controller.isLoadingPeople}
            onlineUserIds={controller.onlineUserIds}
            people={controller.people}
            selectedConversationId={controller.selectedConversationId}
            showThreadOnMobile={controller.showThreadOnMobile}
            onConversationSearchChange={controller.setConversationSearch}
            onSelectConversation={controller.selectConversation}
            onStartChat={(person) => void controller.startChatWithUser(person)}
          />

          <MessageThread
            draft={controller.draft}
            hasDraft={controller.hasDraft}
            isLoading={controller.isLoadingMessages || controller.isLoadingCalls}
            isPeerTyping={controller.selectedPeerTyping}
            isSending={controller.isSending}
            messagesEndRef={controller.messagesEndRef}
            replyingTo={controller.replyingTo}
            selectedPeer={controller.selectedPeer}
            selectedPeerOnline={controller.selectedPeerOnline}
            showThreadOnMobile={controller.showThreadOnMobile}
            timelineItems={controller.timelineItems}
            userId={controller.user?.id}
            onBack={controller.closeThreadOnMobile}
            onDraftChange={controller.setDraft}
            onReply={controller.setReplyingTo}
            onCancelReply={() => controller.setReplyingTo(null)}
            onReact={(message, reaction) => void controller.reactToMessage(message, reaction)}
            onSendMessage={() => void controller.sendMessage()}
            onSendVoiceNote={(audioBlob, durationMs) => void controller.sendVoiceNote(audioBlob, durationMs)}
          />
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesLoading />}>
      <MessagesPageContent />
    </Suspense>
  );
}
