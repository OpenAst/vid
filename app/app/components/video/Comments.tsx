// components/Comments.tsx

'use client'

import { useState, useEffect } from 'react';
import { initSocket } from '@/app/lib/socket';

type Comment = {
  message: string;
  text: string;
  id: string | number;
  user: string;
  likes: number;
  [key: string]: unknown;
};

type Props = {
  jwtToken: string;
  roomId: string;
};


const Comments = ({ jwtToken, roomId }: Props) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyToId, setReplyToId] = useState<string | number | null>(null);
  const [replyText, setReplyText] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [socket, setSocket] = useState<any>(null);


  useEffect(() => {
    const sock = initSocket(jwtToken);
    sock.connect();

    sock.emit("join-room", roomId);

    sock.on("new-comment", (data: Comment) => {
      setComments((prev) => [...prev, data]);
    });

    sock.on("comment-liked", ({ commentId, likes }) => {
      setComments((prev) => 
        prev.map((comment) => 
          comment.id === commentId ? { ...comment, likes } : comment
        )
      )
    });

    setSocket(sock);

    return () => {
      sock.disconnect();
    };
  }, [jwtToken, roomId]);

  const handleReplyClick = (commentId: string | number) => {
    setReplyToId(commentId);
  };

  const handleLike = (commentId: string | number) => {
    if (socket) {
      socket.emit("like-comment", { commentId, roomId });
    }
  };

  const handleSubmitReply = () => {
    if (!replyText.trim() || !socket || replyToId === null) return;
    
    socket.emit("send-comment", {
      parentid: replyToId,
      text: replyText,
      roomId,
    });

    setReplyText('');
    setReplyToId(null);
  };

  return (
    <div className="w-80 bg-gray-50 p-4 border-l border-gray-200">
      <h2 className="font-bold text-sm mb-4">Comment</h2>
      <div className='space-y-4'>
        {comments.map((comment) => (
          <div key={comment.id} className="flex flex-col space-y-1">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-semibold">{comment.user}</p>
                <p className="text-sm text-gray-600">{comment.text}</p>
              </div>
              <p className="text-sm">{comment.likes}</p>
            </div>

            <button
              onClick={() => handleReplyClick(comment.id)}
              className='text-sm text-blue-600'>
                Reply
            </button>

            <div className="text-sm flex flex-col items-end">
              <button
                onClick={() => handleLike(comment.id)}
                className="text-blue-500 hover:underline"
              >
                👍 {comment.likes}
              </button>
            </div>
            {replyToId === comment.id && (
              <div className='mt-2 space-y-1'>
                <textarea
                  className="w-full border rounded p-1 text-sm"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  placeholder="Write your reply..."
                />
                <button
                  onClick={handleSubmitReply}
                  className="text-sm text-white bg-blue-600 px-2 py-1 rounded">
                  Submit Reply
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Comments;