"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { uploadVideo } from "@/app/store/videoSlice";
import { fetchUser } from "@/app/store/authSlice";
import { AppDispatch } from "@/app/store/store";
import { useRouter } from "next/navigation";
import { RootState } from "@/app/store/store";


const UploadVideo = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    views: 0,
    timestamp: Date.now(),
    uploader: "Anonymous",
  });

  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFile) {
      alert("Please select a video file.");
      return;
    }

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("file", selectedFile);

    try {
      await dispatch(uploadVideo(data)).unwrap();
      alert("Video uploaded successfully!");
      router.push("/");
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!user) {
          await dispatch(fetchUser()).unwrap();
          console.log('Error authenticating');
          }
        } catch (error) {
          console.log('Not working', error);
          router.push('/login');
        }

    } 
    checkAuth();
    
  }, [dispatch, router, user, isAuthenticated]);

  if (isLoading) return <div className="flex justify-center items-center h-screen">🔄 Loading...</div>;

  return (
  <>
    {isAuthenticated && 
      <div className="min-h-screen w-full flex justify-center items-center bg-gray-50 px-4 sm:px-6">
        <div className="w-full max-w-2xl px-4 py-6 sm:px-10 lg:px-8">
          <h2 className="text-2xl font-semibold text-center mb-6">Upload a Video</h2>
          <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4 bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Video Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                placeholder="Enter video title"
                value={formData.title}
                onChange={handleInputChange}
                className="border border-gray-300 p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Enter video description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="border border-gray-300 p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="video-upload" className="block text-sm font-medium text-gray-700 mb-1">
                Video File
              </label>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
                required
              />
            </div>

            {preview && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video Preview
                </label>
                <div className="aspect-w-16 aspect-h-9">
                  <video
                    src={preview}
                    controls
                    className="w-full rounded-md border border-gray-200"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Upload Video
            </button>
          </form>
        </div>
      </div>
    }
    
  </>
  );
}

export default UploadVideo;