import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVideos } from '../../store/videoSlice';
import { RootState, AppDispatch } from "../../store/store";
import VideoCard from './VideoCard';
import Comments from "./Comments";
import { Video } from "@/app/store/videoSlice";

const Feed = ({ jwtToken }: { jwtToken: string}) => {
  const dispatch = useDispatch<AppDispatch>();
  const videos = useSelector((state: RootState) => state.video.videos);
  const isLoading = useSelector((state: RootState) => state.video.isLoading);
  const isError = useSelector((state: RootState) => state.video.isError);
  const { token, user } = useSelector((state: RootState) => state.auth);


  

  useEffect(() => {
    const fetchData = async () => {
      try {
        const videos =  dispatch(fetchVideos({ page: 1, limit: 10 }))
        .unwrap()
        console.log("Videos fetched:", videos)
      } catch (err) {
        console.log("Error fetching videos", err);
      }
    };

    fetchData();
  }, [dispatch]);

  return (
    <div className="flex justify-center">
      {isLoading && (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      {isError && <p className="text-red-500 text-center">{isError}</p>}
      <div className="flex flex-col items-center gap-"> 
        {Array.isArray(videos) && videos.map((video: Video) => (
          <div key={video.id} className="w-full max-w-2xl">
            <VideoCard
              id={video.id}
              title={video.title}
              thumbnail={video.thumbnail_url || null}
              file_url={video.file_url || ""}
              views={video.views || 0}
              timestamp={video.timestamp || "N/A"}
              jwtToken={jwtToken}
            />

             <div className="mt-2">
              <Comments
                jwtToken={token}
                roomId={video.id}
                currentUser={{
                  id: user?.id || "",
                  name: user?.username || "Anonymous",
                  avatar: user?.profile_picture
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feed;

