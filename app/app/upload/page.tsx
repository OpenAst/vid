"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUser } from "@/app/store/authSlice";
import { AppDispatch } from "@/app/store/store";
import { useRouter } from "next/navigation";
import { RootState } from "@/app/store/store";
import { toast, ToastContainer} from 'react-toastify';


interface FormDataState {
  title: string;
  description: string;
  thumbnail?: File;
}

const UploadVideo = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  
  // State management
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormDataState>({
    title: "",
    description: ""
  });
  const [isUploading, setIsUploading] = useState(false);

  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);


  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoFile) {
      toast.error("Please select a video file");
      return;
    }

    if (!formData.title) {
      toast.error("Please enter a title");
      return;
    }

    try {
      setIsUploading(true);

      const body = new FormData();
      body.append('file', videoFile);
      body.append('title', formData.title);
      body.append('description', formData.description);


      const res = await fetch("/api/video/upload/", {
        method: "POST",
        credentials: "include",
        body,
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get presigned URL");
      }

      console.log("Upload response data:", data);

      // STEP 2: Save metadata in database via a separate API route
      const metadata = {
        title: formData.title,
        description: formData.description || '',
        file_url: data.file_url,     
        file_key: data.object_key,    
        file_size: videoFile.size,
        file_type: videoFile.type,
      };

      console.log("Metadata being sent", metadata);

      const metaRes = await fetch("/api/video/save-metadata/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(metadata),
      });

      const metaDataRes = await metaRes.json();

      if (!metaDataRes.ok) {
        throw new Error(metaDataRes.error || "Failed to save metadata");
      }
      console.log("Upload successful");
      
      toast.success("Video uploaded successfully");
      router.push("/");
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error.message || "Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        if (!isAuthenticated) {
          await dispatch(fetchUser()).unwrap();
        }
      } catch (error) {
        router.push('/login');
      }
    };

    verifyAuth();
  }, [dispatch, router, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload New Video</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Input */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Video Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                required
                maxLength={100}
              />
            </div>
            <ToastContainer />
            {/* Description Input */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                maxLength={500}
              />
            </div>

            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video File *
              </label>
              <div className="mt-1 flex items-center">
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Select Video
                  <input
                    id="video-upload"
                    name="video"
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="sr-only"
                    required
                  />
                </label>
                <span className="ml-2 text-sm text-gray-500">
                  {videoFile ? videoFile.name : "No file selected"}
                </span>
              </div>
              {previewUrl && (
                <div className="mt-4">
                  <video
                    src={previewUrl}
                    controls
                    className="w-full rounded-md border border-gray-200"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className={`w-full flex btn btn-primary justify-center py-3 
                  px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                  hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2
                focus:ring-orange-500 focus:border-orange-500 ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isUploading ? 'Uploading...' : 'Upload Video'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadVideo;