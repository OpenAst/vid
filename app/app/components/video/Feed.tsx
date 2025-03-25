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
    <div>
      {isLoading && (
      <p className="flex justify-center items-center h-screen">
        🔄 Loading...
      </p>
      )}
      {isError && <p>{isError}</p>}
      <ul className='grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4'>
        {videos?.results?.map((video: any) => (
          <VideoCard
           key={video.id}
           id={video.id}
           title={video.title}
           thumbnail={video.thumbnail}
           file_url={video.file_url}
           description={video.description}
           uploader={video.uploader}
           views={video.views}
           timestamp={video.timestamp}/>
        ))}
      </ul>
    </div>
  )
}
export default Feed;

