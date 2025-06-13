'use client'

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Image from 'next/image';

type Comment = {
  id: string
  text: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  likes: number;
  createdAt: string;
  replies?: Comment[];
};

type Props = {
  jwtToken: string;
  roomId: string;
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
  };
};


const Comments = ({ jwtToken, roomId, currentUser }: Props) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL_DEV, {
      auth: { token: jwtToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', roomId);
      console.log('Connected to comments room:', roomId);
    });

    socket.on('comments-history', (history: Comment[]) => {
      setComments(history);
    });

    socket.on("new-comment", (comment: Comment) => {
      setComments((prev) => [...prev, comment]);
      setShowCommentInput(false);
      setNewComment('');
    });

    socket.on("comment-liked", ({ commentId, likes }) => {
      setComments((prev) => 
        prev.map((comment) => 
          comment.id === commentId ? { ...comment, likes } : comment
        )
      );
    });
    
    socket.on('new-reply', ({ parentId, reply }: { parentId: string, reply: Comment }) => {
      setComments(prev => prev.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), reply]
          };
        }
        return comment;
      }));
      setReplyText('');
      setReplyingTo('null');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from comments');
    });

    return () => {
      socket.disconnect();
    };
  }, [jwtToken, roomId]);


  const handleSendComment = () => {
    if (!newComment.trim() || !socketRef.current) return;

    socketRef.current.emit('send-comment', {
      text: newComment,
      roomId,
      user: currentUser
    });
    setNewComment('');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  }
  const handleLike = (commentId: string ) => {
    socketRef.current?.emit("like-comment", { commentId, roomId });
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !socketRef.current || !replyingTo ) return;
    
    socketRef.current?.emit("send-reply", {
      parentId: replyingTo,
      text: replyText,
      roomId,
      user: currentUser
    });

    setReplyText('');
    setReplyingTo(null);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow p-2">
      <div 
        className="flex items-center justify-between cursor-pointer p-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-sm font-semibold">Comments ({comments.length})</h2>
        <span>{isExpanded ? '▲' : '▼'}</span>
      </div>

      {isExpanded && (
        <>
          {showCommentInput ? (
            <div className="mb-4 p-2">
              <textarea 
                ref={textareaRef}
                className="w-full border rounded p-2 text-sm mb-2"
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
                  className="bg-blue-500 text-white text-sm px-4 py-2 rounded hover:bg-blue-700"
                >
                  Post Comment
                </button>
                <button
                  onClick={() => {
                    setShowCommentInput(false)
                    setNewComment('');}
                  }
                  className="border px-4 py-2 text-sm rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowCommentInput(true)
                setTimeout(() => textareaRef.current?.focus(), 0);}
              }
              className="w-full text-left p-2 text-blue-500 hover:bg-gray-50 rounded"
            >
              Add a comment...
            </button>
          )}

          <div className="space-y-4 max-h-96 overflow-y-auto p-2">
            {comments.map((comment) => (
              <div key={comment.id} className='border-b pb-2'>
                <div className='flex items-start space-x-2'>
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                      {comment.user.avatar ? (
                        <Image src={comment.user.avatar} alt={comment.user.name} className="rounded-full" />
                      ) : (
                        <span>{comment.user.name.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <div className='flex-1'>
                    <div className='flex justify-between'>
                      <span className='font-medium'>{comment.user.name}</span>
                      <span className='text-xs text-gray-500'>{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <p className='text-sm my-1'>{comment.text}</p>
                    <div className='flex space-x-4 text-xs'>
                      <button 
                        onClick={() => handleLike(comment.id)}
                        className='flex items-center space-x-1'>
                        <span>👍</span>
                        <span>{comment.likes}</span>
                      </button>
                      <button 
                        onClick={() => setReplyingTo(comment.id)}
                        className='text-blue-600'>
                          Reply
                      </button>
                    </div>

                    {/* Reply form */}
                    {replyingTo === comment.id && (
                      <div className='mt-2 ml-6'>
                        <textarea 
                          className='w-full border rounded p-2 text-sm mb-2'
                          placeholder='Write your reply...'
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                        />
                        <div className='flex space-x-2'>
                          <button
                            onClick={handleSendReply}
                            className='bg-blue-600 text-white px-3 py-1 rounded text-sm'>
                                Post Reply
                          </button>
                          <button
                            onClick={() => setReplyingTo(null)}
                            className='border px-3 py-1 rounded text-sm'
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {comment.replies?.map((reply) => (
                      <div key={reply.id} className='mt-2 ml-6 pl-2 border-l-2 border-gray-200'>
                        <div className="flex items-start space-x-2">
                          <div className="flex-shrink-0">
                            <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                              {reply.user.avatar ? (
                                <Image src={reply.user.avatar} alt={reply.user.name} className="rounded-full" />
                              ) : (
                                <span>{reply.user.name.charAt(0)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div>
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">{reply.user.name}</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(reply.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs my-1">{reply.text}</p>
                              <div className="flex space-x-4 text-xs">
                                <button 
                                  onClick={() => handleLike(reply.id)}
                                  className="flex items-center space-x-1"
                                >
                                  <span>👍</span>
                                  <span>{reply.likes}</span>
                                </button>
                              </div>
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