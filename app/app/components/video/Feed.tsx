import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVideos } from '../../store/videoSlice';
import { RootState, AppDispatch } from "../../store/store";
import VideoCard from './VideoCard';


const Feed = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {videos, isError, isLoading } = useSelector((state: RootState) => state.video);
  
  useEffect(() => {
    dispatch(fetchVideos({ page: 1, limit: 10 }))
      .unwrap()
      .then((response) => {
        console.log("Videos fetched:", response)
      })
      .catch((error) => {
        console.error("Failed to fetch videos:", error);
      });  
  }, [dispatch]);

  return (
    <div className="flex justify-center">
      {isLoading && (
        <p className="flex justify-center items-center h-32"> 
          🔄 Loading...
        </p>
      )}
      {isError && <p className="text-red-500 text-center">{isError}</p>}
      <div className="flex flex-col items-center gap-4"> 
        {videos?.results?.map((video: any) => (
          <div key={video.id} className="w-full max-w-2xl">
            <VideoCard
              key={video.id}
              id={video.id}
              title={video.title}
              thumbnail={video.thumbnail}
              file_url={video.file_url}
              views={video.views}
              timestamp={video.timestamp}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feed;

