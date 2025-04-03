import React from "react";
import Image from 'next/image';

interface VideoProps {
  id: string;
  title: string;
  thumbnail: string;
  file_url: string;
  views: number;
  timestamp: string;
}

const VideoCard: React.FC<VideoProps> = ({ title, thumbnail, file_url, views, timestamp }) => {
  return (
    <div className="w-full max-w-xs p-2 rounded-lg transition hover:scale-105">
      {thumbnail ? (
        <Image src={thumbnail} alt={title} className="w-full h-44 object-cover rounded-md" />
      ) : (
        <video src={file_url} controls className="w-full h-44 rounded-md" />
      )}
      
      <div className="mt-2">
        <h3 className="text-sm font-medium truncate">{title}</h3>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>👀 {views}</span>
          <span>{timestamp}</span>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
