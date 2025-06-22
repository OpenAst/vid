'use client';

import {  useState } from 'react';
import SearchBox from './SearchBox';

type Video = {
  id: number
  title: string;
  tags: string[];
}

const VideoSearchPage = () => {
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);

  const videos = [
    { id: 1, title: 'React Basics', tags: ['react', 'frontend']},
    { id: 2, title: 'How to cook Fried Rice', tags: ['food', 'cooking']},
  ];

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredVideos([]);
      return;
    }

    const results = videos.filter((video) => 
      video.title.toLowerCase().includes(query.toLowerCase()) || 
      video.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    );

    setFilteredVideos(results);
  };

  return (
    <div className='p-4'>
      <SearchBox onSearch={handleSearch} />
      <div className='mt-6'>
        {filteredVideos.length > 0 ? (
          <ul className='space-y-2'>
            {filteredVideos.map((video) => (
              <li key={video.id}>
                <h3 className='text-lg font-semibold'>{video.title}</h3>
                <p className='text-sm text-gray-500'>
                  Tags: {video.tags.join(', ')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-gray-400'>No results found yet.</p>
        )}
      </div>
    </div>
  )
}

export default VideoSearchPage;