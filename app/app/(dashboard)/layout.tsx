// dashboard/layout.tsx
import Sidebar from '../components/Sidebar';
import VideoFeed from '../components/VideoFeed';
import Comments from '../components/Comments';

const Dashboard = () => {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Video Feed */}
      <VideoFeed />

      {/* Comments */}
      <Comments />
    </div>
  );
};

export default Dashboard;
