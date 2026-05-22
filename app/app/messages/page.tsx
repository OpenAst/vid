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
    <div className="h-[100dvh] min-h-[100dvh] overflow-hidden bg-base-100 pt-px text-base-content md:pl-[100px]">
      <div className="grid h-[calc(100dvh-1px)] min-h-0 overflow-hidden border-t border-base-300 bg-base-100 md:grid-cols-[380px_minmax(0,1fr)]">
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
          isLoading={controller.isLoadingMessages}
          isPeerTyping={controller.selectedPeerTyping}
          isSending={controller.isSending}
          sendError={controller.sendError}
          selectedAttachment={controller.selectedAttachment}
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
          onClearAttachment={controller.clearAttachment}
          onDeleteForEveryone={(message) => controller.deleteMessageForEveryone(message)}
          onDeleteForMe={(message) => controller.deleteMessageForMe(message)}
          onFileSelected={controller.selectAttachment}
          onReact={(message, reaction) => void controller.reactToMessage(message, reaction)}
          onRetrySend={() => void controller.sendMessage()}
          onSendMessage={() => void controller.sendMessage()}
          onSendVoiceNote={(audioBlob, durationMs) => void controller.sendVoiceNote(audioBlob, durationMs)}
          onUndoDeleteForMe={(message) => controller.undoDeleteMessageForMe(message)}
        />
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
