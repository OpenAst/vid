// components/Comments.tsx

'use client'

import { useState } from 'react';

const Comments = () => {
  const [comments] = useState([
    { id: 1, user: 'User1', text: 'Great video!', likes: 12 },
    { id: 2, user: 'User2', text: 'Amazing content!', likes: 20 },
  ]);

  return (
    <div className="w-80 bg-gray-50 p-4 border-l border-gray-200">
      <h2 className="font-bold text-lg mb-4">Comments</h2>
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex justify-between">
            <div>
              <p className="text-sm font-semibold">{comment.user}</p>
              <p className="text-sm text-gray-600">{comment.text}</p>
            </div>
            <p className="text-sm">❤️ {comment.likes}</p>
            <button className="text-sm ">Reply</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Comments;
