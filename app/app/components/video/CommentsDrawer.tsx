"use client";
import { X } from "lucide-react";
import Comments from "./Comments";
import { motion, AnimatePresence } from "framer-motion";

interface CommentsDrawerProps {
  videoId: string;
  jwtToken: string;
  currentUser: {
    id: string;
    username: string;
    avatar?: string;
  };
  videoOwnerId?: string;
  onClose: () => void;
}

const CommentsDrawer = ({ videoId, jwtToken, currentUser, videoOwnerId, onClose }: CommentsDrawerProps) => {
  return (
    <AnimatePresence>
      <motion.div
        className="w-full flex flex-col no-scrollbar shadow-2xl bg-base-100 rounded-t-3xl justify-end border-t border-base-300 transition-colors"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "40vh", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex justify-between items-center p-4 border-b border-base-300">
          <h2 className="font-bold text-lg text-base-content">Comments</h2>
          <button onClick={onClose} className="hover:bg-base-200 p-1 rounded-full transition-colors text-base-content">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Comments jwtToken={jwtToken} roomId={videoId} currentUser={currentUser} videoOwnerId={videoOwnerId} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommentsDrawer;
