"use client";
import { X } from "lucide-react";
import Comments from "./Comments";
import { motion, AnimatePresence } from "framer-motion";

interface CommentsDrawerProps {
  videoId: string;
  jwtToken: string;
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  onClose: () => void;
}

const CommentsDrawer = ({ videoId, jwtToken, currentUser, onClose }: CommentsDrawerProps) => {
  return (
    <AnimatePresence>
      <motion.div
        className="w-full flex flex-col shadow-lg bg-white rounded-t-2xl justify-end"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "40vh", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
          <div className="flex justify-between items-center p-3 border-b">
            <h2 className="font-semibold">Comments</h2>
            <button onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Comments jwtToken={jwtToken} roomId={videoId} currentUser={currentUser} />
          </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommentsDrawer;
