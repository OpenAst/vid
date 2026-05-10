"use client";
import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store/store";
import { createRealtimeSocket, type RealtimeSocket } from "@/app/lib/socket";
import UserAvatar from "@/app/components/common/UserAvatar";
import { Heart, MessageCircle, Pin, Send, X } from "lucide-react";


type Comment = {
  id: string;
  content: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    profile?: {
      avatar?: string | null;
    };
  };
  likes: number;
  created_at: string;
  is_pinned?: boolean;
  replies?: Comment[];
};

export type Props = {
  jwtToken: string;
  roomId: string;
  currentUser: {
    id: string;
    username: string;
    avatar?: string;
  };
  videoOwnerId?: string;
};

function renderMentions(text: string) {
  return text.split(/(@[a-zA-Z0-9_]+)/g).map((part, index) => {
    if (part.startsWith("@")) {
      return <span key={`${part}-${index}`} className="font-semibold text-primary">{part}</span>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

const Comments = ({ jwtToken, roomId, currentUser: _currentUser, videoOwnerId }: Props) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const socketRef = useRef<RealtimeSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { user } = useSelector((state: RootState) => state.auth);
  const isVideoOwner = Boolean(user?.id && videoOwnerId && user.id === videoOwnerId);
  const pinnedComment = comments.find((comment) => comment.is_pinned);
  const regularComments = comments.filter((comment) => !comment.is_pinned);
  const mentionUsers = Array.from(
    new Map(
      comments
        .flatMap((comment) => [comment.user, ...(comment.replies || []).map((reply) => reply.user)])
        .filter((commentUser) => commentUser?.username)
        .map((commentUser) => [commentUser.username, commentUser])
    ).values()
  ).slice(0, 6);

  useEffect(() => {
    if (!jwtToken || !roomId) return;

    const socket = createRealtimeSocket(jwtToken);

    socketRef.current = socket;

    const handleConnect = () => {
      socket.emit("comments:join", { roomId });
    };

    const handleCommentsHistory = (payload: { roomId: string; comments: Comment[] }) => {
      setComments(payload.comments);
    };

  const handleNewComment = (payload: { roomId: string; comment: Comment }) => {
      setComments((prev) => payload.comment.is_pinned ? [payload.comment, ...prev] : [...prev, payload.comment]);
      setShowCommentInput(false);
      setNewComment("");
    };

    const handleCommentLiked = (payload: {
      roomId: string;
      commentId: string;
      likes: number;
      liked: boolean;
      actorUserId: string;
    }) => {
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === payload.commentId) {
            return { ...comment, likes: payload.likes };
          }

          if (comment.replies?.length) {
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === payload.commentId ? { ...reply, likes: payload.likes } : reply
              ),
            };
          }

          return comment;
        })
      );
    };

    const handleNewReply = (payload: {
      roomId: string;
      parentId: string;
      reply: Comment;
    }) => {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === payload.parentId
            ? { ...comment, replies: [...(comment.replies || []), payload.reply] }
            : comment
        )
      );
      setReplyText("");
      setReplyingTo(null);
    };

    socket.on("connect", handleConnect);
    socket.on("comments.history", handleCommentsHistory);
    socket.on("new_comment", handleNewComment);
    socket.on("comment_liked", handleCommentLiked);
    socket.on("new_reply", handleNewReply);
    socket.on("connect_error", (error) => {
      console.error("Socket.IO error in comments feed", error);
    });

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("comments.history", handleCommentsHistory);
      socket.off("new_comment", handleNewComment);
      socket.off("comment_liked", handleCommentLiked);
      socket.off("new_reply", handleNewReply);
      socket.disconnect();
    };
  }, [jwtToken, roomId]);

  const handleSendComment = () => {
    if (!newComment.trim() || !socketRef.current) return;

    socketRef.current.emit("comments:send_comment", {
      roomId,
      text: newComment,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const handleLike = (commentId: string) => {
    if (!user || !socketRef.current) return;
    socketRef.current.emit("comments:vote_comment", {
      roomId,
      commentId,
    });
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !socketRef.current || !replyingTo) return;

    socketRef.current.emit("comments:send_reply", {
      roomId,
      parentId: replyingTo,
      text: replyText,
    });
  };

  const toggleReplyForm = (commentId: string) => {
    if (replyingTo === commentId) {
      setReplyingTo(null);
      setReplyText("");
      return;
    }

    setReplyingTo(commentId);
    setReplyText("");
  };

  const insertMention = (username: string, target: "comment" | "reply") => {
    const mention = `@${username} `;
    if (target === "reply") {
      setReplyText((current) => current.includes(mention) ? current : `${current}${current ? " " : ""}${mention}`);
      return;
    }
    setNewComment((current) => current.includes(mention) ? current : `${current}${current ? " " : ""}${mention}`);
    setShowCommentInput(true);
  };

  const togglePinComment = async (comment: Comment) => {
    try {
      const response = await fetch(`/api/comments/${comment.id}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: !comment.is_pinned }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to update pinned comment");
      }
      const updated = data.comment as Comment;
      setComments((current) =>
        current
          .map((item) => item.id === updated.id ? updated : { ...item, is_pinned: updated.is_pinned ? false : item.is_pinned })
          .sort((a, b) => Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned)))
      );
    } catch (error) {
      console.error("Unable to pin comment", error);
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [comments])

  return (
    <div className="w-full bg-base-100 rounded-lg text-base-content transition-colors">
      <div
        className="flex items-center justify-between cursor-pointer p-4 hover:bg-base-200 transition-colors rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-sm font-bold">Comments ({comments.length})</h2>
        <span className="opacity-60">{isExpanded ? "▲" : "▼"}</span>
      </div>

      {isExpanded && (
        <>
          {showCommentInput ? (
            <div className="mb-4 p-4 bg-base-200 rounded-xl mx-2 shadow-inner">
              <textarea
                ref={textareaRef}
                className="w-full bg-base-100 border border-base-300 rounded-lg p-3 text-sm mb-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:opacity-50"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                autoFocus
              />
              {mentionUsers.length > 0 && (
                <div className="mb-3 flex gap-2 overflow-x-auto">
                  {mentionUsers.map((mentionUser) => (
                    <button
                      key={mentionUser.id}
                      type="button"
                      onClick={() => insertMention(mentionUser.username, "comment")}
                      className="shrink-0 rounded-full bg-base-100 px-3 py-1 text-xs font-semibold text-primary"
                    >
                      @{mentionUser.username}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={handleSendComment}
                  className="btn btn-primary btn-sm rounded-lg"
                >
                  <Send size={14} />
                  Post
                </button>
                <button
                  onClick={() => {
                    setShowCommentInput(false);
                    setNewComment("");
                  }}
                  className="btn btn-ghost btn-sm rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowCommentInput(true);
                setTimeout(() => textareaRef.current?.focus(), 0);
              }}
              className="w-full text-left p-4 text-primary hover:bg-base-200 transition-colors font-medium border-t border-base-300"
            >
              Add a comment...
            </button>
          )}

          <div className="space-y-4 max-h-96 overflow-y-auto p-2 no-scrollbar">
            {pinnedComment && (
              <div className="rounded-2xl border border-primary/25 bg-primary/10 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-primary">
                  <Pin size={13} fill="currentColor" />
                  Pinned by creator
                  {isVideoOwner && (
                    <button
                      type="button"
                      onClick={() => void togglePinComment(pinnedComment)}
                      className="ml-auto rounded-full px-2 py-1 text-[10px] font-bold hover:bg-primary/10"
                    >
                      Unpin
                    </button>
                  )}
                </div>
                <div className="flex items-start space-x-2">
                  <UserAvatar user={pinnedComment.user} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">@{pinnedComment.user.username}</p>
                    <p className="mt-1 text-sm leading-relaxed text-base-content/90">{renderMentions(pinnedComment.content)}</p>
                  </div>
                </div>
              </div>
            )}

            {regularComments.map((comment) => (
              <div key={comment.id} className="border-b border-base-300 last:border-0 pb-4 last:pb-0">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    <UserAvatar user={comment.user} size={32} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-sm text-base-content">@{comment.user.username}</span>
                      <div className="flex items-center gap-2">
                        {isVideoOwner && (
                          <button
                            type="button"
                            onClick={() => void togglePinComment(comment)}
                            className="rounded-full px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/10"
                          >
                            Pin
                          </button>
                        )}
                        <span className="text-[10px] text-base-content/50">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm my-1 text-base-content/90 leading-relaxed">{renderMentions(comment.content)}</p>
                    <div className="flex space-x-6 text-xs mt-2 font-semibold">
                      <button onClick={() => handleLike(comment.id)} className="flex items-center space-x-1 hover:text-primary transition-colors">
                        <Heart size={13} />
                        <span>{comment.likes}</span>
                      </button>
                      <button onClick={() => toggleReplyForm(comment.id)} className="inline-flex items-center gap-1 text-primary hover:underline transition-all">
                        <MessageCircle size={13} />
                        {replyingTo === comment.id ? "Close" : "Reply"}
                      </button>
                    </div>

                    {replyingTo === comment.id && (
                      <div className="mt-3 ml-2 p-3 bg-base-200 rounded-xl border border-base-300">
                        <textarea
                          className="w-full bg-base-100 border border-base-300 rounded-lg p-2 text-sm mb-2 focus:ring-2 focus:ring-primary outline-none text-base-content"
                          placeholder={`Reply to @${comment.user.username}...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                        />
                        <div className="mb-2 flex flex-wrap gap-2">
                          {Array.from(
                            new Map([comment.user, ...mentionUsers].filter(Boolean).map((mentionUser) => [mentionUser.id, mentionUser])).values()
                          ).slice(0, 5).map((mentionUser) => (
                            <button
                              key={mentionUser.id}
                              type="button"
                              onClick={() => insertMention(mentionUser.username, "reply")}
                              className="rounded-full bg-base-100 px-2.5 py-1 text-[11px] font-semibold text-primary"
                            >
                              @{mentionUser.username}
                            </button>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSendReply}
                            className="btn btn-primary btn-xs rounded"
                          >
                            Reply
                          </button>
                          <button onClick={() => { setReplyingTo(null); setReplyText(""); }} className="btn btn-ghost btn-xs rounded">
                            <X size={12} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {comment.replies?.map((reply) => (
                      <div key={reply.id} className="mt-3 ml-4 pl-4 border-l-2 border-base-300">
                        <div className="flex items-start space-x-2">
                          <div className="flex-shrink-0">
                            <UserAvatar user={reply.user} size={24} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-baseline">
                              <span className="text-xs font-bold text-base-content">@{reply.user.username}</span>
                              <span className="text-[10px] text-base-content/40">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs my-1 text-base-content/80">{renderMentions(reply.content)}</p>
                            <div className="flex space-x-4 text-[10px] font-bold">
                              <button onClick={() => handleLike(reply.id)} className="flex items-center space-x-1 hover:text-primary transition-colors">
                                <Heart size={11} />
                                <span>{reply.likes}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Comments;
