"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store/store";
import { buildWebSocketUrl } from "@/app/lib/websocket";


type Comment = {
  id: string;
  content: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  likes: number;
  created_at: string;
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
};

const Comments = ({ jwtToken, roomId, currentUser: _currentUser }: Props) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!jwtToken || !roomId) return;

    const socket = new WebSocket(buildWebSocketUrl(`/ws/comments/${roomId}/`, jwtToken));

    socketRef.current = socket;

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === "comments.history") {
        setComments(payload.comments);
        return;
      }

      if (payload.type === "new_comment") {
        setComments((prev) => [...prev, payload.comment]);
        setShowCommentInput(false);
        setNewComment("");
        return;
      }

      if (payload.type === "comment_liked") {
        setComments((prev) =>
          prev.map((comment) => {
            if (comment.id === payload.commentId) {
              return { ...comment, likes: payload.likes };
            }

            if (comment.replies?.length) {
              return {
                ...comment,
                replies: comment.replies.map((reply) =>
                  reply.id === payload.commentId
                    ? { ...reply, likes: payload.likes }
                    : reply
                ),
              };
            }

            return comment;
          })
        );
        return;
      }

      if (payload.type === "new_reply") {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === payload.parentId
              ? { ...comment, replies: [...(comment.replies || []), payload.reply] }
              : comment
          )
        );
        setReplyText("");
        setReplyingTo(null);
      }
    };

    return () => {
      socket.close();
    };
  }, [jwtToken, roomId]);

  const handleSendComment = () => {
    if (!newComment.trim() || !socketRef.current) return;
    if (socketRef.current.readyState !== WebSocket.OPEN) return;

    socketRef.current.send(
      JSON.stringify({
        action: "send_comment",
        text: newComment,
      })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const handleLike = (commentId: string) => {
    if (!user || socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current?.send(
      JSON.stringify({
        action: "vote_comment",
        commentId,
      })
    );
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !socketRef.current || !replyingTo) return;
    if (socketRef.current.readyState !== WebSocket.OPEN) return;

    socketRef.current.send(
      JSON.stringify({
        action: "send_reply",
        parentId: replyingTo,
        text: replyText,
      })
    );
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
              <div className="flex space-x-2">
                <button
                  onClick={handleSendComment}
                  className="btn btn-primary btn-sm rounded-lg"
                >
                  Post Comment
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
            {comments.map((comment) => (
              <div key={comment.id} className="border-b border-base-300 last:border-0 pb-4 last:pb-0">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    {/* Check both top-level avatar (if any) and nested profile avatar */}
                    {comment.user.avatar || (comment.user as any).profile?.avatar ? (
                      <Image
                        src={comment.user.avatar || (comment.user as any).profile?.avatar}
                        height={32}
                        width={32}
                        alt={comment.user.username}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-base-300 flex items-center justify-center text-sm font-bold text-base-content/60">
                        <span>{comment.user.username?.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-sm text-base-content">@{comment.user.username}</span>
                      <span className="text-[10px] text-base-content/50">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm my-1 text-base-content/90 leading-relaxed">{comment.content}</p>
                    <div className="flex space-x-6 text-xs mt-2 font-semibold">
                      <button onClick={() => handleLike(comment.id)} className="flex items-center space-x-1 hover:text-primary transition-colors">
                        <span>❤️</span>
                        <span>{comment.likes}</span>
                      </button>
                      <button onClick={() => setReplyingTo(comment.id)} className="text-primary hover:underline transition-all">
                        Reply
                      </button>
                    </div>

                    {replyingTo === comment.id && (
                      <div className="mt-3 ml-2 p-3 bg-base-200 rounded-xl border border-base-300">
                        <textarea
                          className="w-full bg-base-100 border border-base-300 rounded-lg p-2 text-sm mb-2 focus:ring-2 focus:ring-primary outline-none text-base-content"
                          placeholder="Write your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSendReply}
                            className="btn btn-primary btn-xs rounded"
                          >
                            Reply
                          </button>
                          <button onClick={() => setReplyingTo(null)} className="btn btn-ghost btn-xs rounded">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {comment.replies?.map((reply) => (
                      <div key={reply.id} className="mt-3 ml-4 pl-4 border-l-2 border-base-300">
                        <div className="flex items-start space-x-2">
                          <div className="flex-shrink-0">
                            {reply.user.avatar || (reply.user as any).profile?.avatar ? (
                              <Image
                                src={reply.user.avatar || (reply.user as any).profile?.avatar}
                                height={24}
                                width={24}
                                alt={reply.user.username}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-base-300 flex items-center justify-center text-[10px] font-bold text-base-content/50">
                                <span>{reply.user.username.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-baseline">
                              <span className="text-xs font-bold text-base-content">@{reply.user.username}</span>
                              <span className="text-[10px] text-base-content/40">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs my-1 text-base-content/80">{reply.content}</p>
                            <div className="flex space-x-4 text-[10px] font-bold">
                              <button onClick={() => handleLike(reply.id)} className="flex items-center space-x-1 hover:text-primary transition-colors">
                                <span>❤️</span>
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
