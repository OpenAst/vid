'use client';

import { useState } from 'react';

export default function VideoFeed() {
  const [videos] = useState([
    { id: 1, src: '/video1.mp4', likes: 120, comments: 45 },
    { id: 2, src: '/video2.mp4', likes: 330, comments: 67 },
  ]);

  return (
    <div className="flex-1 bg-white overflow-y-auto">
      {videos.map((video) => (
        <div key={video.id} className="relative h-screen flex items-center justify-center">
          <video
            src={video.src}
            className="h-[90%] w-auto"
            autoPlay
            loop
            muted
          />
          <div className="absolute right-8 bottom-20 space-y-4 text-white text-center">
            <button>❤️ {video.likes}</button>
            <button>💬 {video.comments}</button>
            <button>🔗 Share</button>
          </div>
        </div>
      ))}
    </div>
  );
}
