import React from "react";
import Image from 'next/image';

interface VideoProps {
  id: string;
  title: string;
  thumbnail: string | null;
  file_url: string  ;
  views: number;
  timestamp: string;
  jwtToken: string;
}

const VideoCard: React.FC<VideoProps> = ({ title, thumbnail, file_url, views, timestamp }) => {
  return (
    <div className="w-full max-w-sm p-2 rounded-lg transition hover:scale-105">
      <div className="aspect-w-16 aspect-h-9 w-full">
        {thumbnail ? (
          <Image 
            src={thumbnail} alt={title} 
            width={320}
            height={180}
            className="w-full h-full object-cover rounded-md" />
        ) : (
          <video src={file_url} controls 
            className="w-full h-full rounded-md object-contain" />
        )}
      </div>
      
      <div className="mt-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{views}</span>
          <span>{timestamp}</span>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
