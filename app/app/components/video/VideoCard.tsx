import React from "react";
import Image from 'next/image';

interface VideoProps {
  id: string;
  title: string;
  thumbnail: string;
  file_url: string;
  description: string;
  uploader: string;
  views: number;
  timestamp: string;
}

const VideoCard: React.FC<VideoProps> = (
  { id, title, thumbnail, uploader,
     description, file_url, views, timestamp }
) => {
  return (
    <div className="w-full max-w-sm rounded-lg shadow-lg bg-gray-900 text-white p-4">
      {thumbnail ? (
        <Image src={thumbnail} alt={title} className="w-full h-40 object-cover rounded-md" />
      ) : (
        <video src={file_url} controls className="w-ful h-48 rounded-md " />
      )}
    <div className="mt-3">
      <h3 className="text-lg font-semibold truncate">{title}</h3>
      <p className="text-sm text-gray-400">By {uploader}</p>
      <div className="flex justify-between text-gray-500 text-sm mt-1">
        <span>👀 {views} views</span>
        <span>🕒 {timestamp}</span>
      </div>

      <p className="text-sm text-gray-300 mt-2 line-clamp-2">{description}</p>
      <p className="text-xs text-gray-500 mt-1">ID: {id}</p>
    </div>
    </div>
  );
};

export default VideoCard;
