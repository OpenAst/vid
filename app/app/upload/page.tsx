"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, Video, X, Square } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUser } from "@/app/store/authSlice";
import { AppDispatch } from "@/app/store/store";
import { useRouter } from "next/navigation";
import { RootState } from "@/app/store/store";
import { toast, ToastContainer } from 'react-toastify';


interface FormDataState {
  title: string;
  description: string;
  thumbnail?: File;
}

const CHUNK_SIZE = 10 * 1024 * 1024;

const UploadVideo = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();


  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormDataState>({
    title: "",
    description: ""
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsRecording(false);
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    setRecordedChunks([]);
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp8,opus"
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks(prev => [...prev, event.data]);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    toast.info("Recording started...");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Recording finished!");
    }
  };

  const saveRecording = () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const file = new File([blob], `recorded_video_${Date.now()}.webm`, { type: "video/webm" });
    setVideoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    stopCamera();
  };


  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      toast.error("Selected file is not a valid video");
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoFile) {
      toast.error("Please select or record a video file");
      return;
    }

    if (!formData.title) {
      toast.error("Please enter a title");
      return;
    }

    try {
      setIsUploading(true);


      // Sanitize filename: replace spaces/special chars with underscores, keep alphanumeric and dots
      const sanitizedFileName = videoFile.name
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_');

      const initRes = await fetch("/api/video/initiate", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          file_name: sanitizedFileName,
          file_type: videoFile.type,
        })
      });

      if (!initRes.ok) {
        throw new Error("Failed to initiate upload");
      }

      const { upload_id, object_key, public_url } = await initRes.json();

      let partNumber = 1;
      let start = 0;
      const parts: { ETag: string; PartNumber: number }[] = [];

      while (start < videoFile.size) {
        const end = Math.min(start + CHUNK_SIZE, videoFile.size);
        const chunk = videoFile.slice(start, end);

        const presignedRes = await fetch(
          "/api/video/presigned",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              object_key,
              file_type: videoFile.type,
              upload_id,
              part_number: partNumber,
            }),
          }
        );

        if (!presignedRes.ok) throw new Error("Failed to get presigned URL");

        const { url } = await presignedRes.json();
        console.log(`Uploading chunk ${partNumber} to: ${url}`);

        // Upload chunk directly to R2
        let uploadRes;
        try {
          uploadRes = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": videoFile.type },
            body: chunk,
          });
        } catch (fetchErr) {
          console.error(`Fetch failed for chunk ${partNumber}:`, fetchErr);
          throw new Error(`Connection failed while uploading chunk ${partNumber}. This might be a CORS issue.`);
        }

        if (!uploadRes.ok) throw new Error(`Chunk ${partNumber} upload failed`);

        const eTag = uploadRes.headers.get("ETag");
        if (!eTag) throw new Error("Missing ETag from upload response");

        parts.push({ ETag: eTag.replace(/"/g, ""), PartNumber: partNumber });

        partNumber++;
        start = end;
      }

      // Complete multipart upload
      const completeRes = await fetch(
        "/api/video/complete_multipart",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ object_key, upload_id, parts }),
        }
      );

      if (!completeRes.ok) throw new Error("Failed to complete upload");

      const completeData = await completeRes.json();
      const finalUrl = completeData.public_url || public_url;

      // Save metadata
      const metadata = {
        title: formData.title,
        description: formData.description || '',
        file_url: finalUrl,
        file_key: object_key,
        file_size: videoFile.size,
        file_type: videoFile.type,
      };

      console.log("Metadata being sent", metadata);

      const metaRes = await fetch("/api/video/save-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(metadata),
      });

      if (!metaRes.ok) {
        const errorData = await metaRes.json();
        throw new Error(errorData.error || "Failed to save metadata");
      }

      const metaDataRes = await metaRes.json();

      console.log("Upload successful", metaDataRes);

      toast.success("Video upload and metadata saved successfully");
      router.push("/");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error((error as Error).message || "Failed to upload video");
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
        console.log("Auth user not found", error);
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
    <div className="min-h-screen md:max-h-screen bg-base-200 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-3xl mx-auto">
        <div className="bg-base-100 shadow-xl rounded-2xl p-6 sm:p-8 border border-base-300">
          <h1 className="text-2xl font-bold text-base-content mb-6">Upload New Video</h1>

          <form onSubmit={handleSubmit} className="space-y-6 relative">
            {/* Title Input */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-base-content/80 mb-1">
                Video Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base-content"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-base-content/80 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base-content"
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-base-content/80 mb-1">
                Video Content *
              </label>

              {!isCameraActive ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label
                      htmlFor="video-upload"
                      className="flex-1 cursor-pointer bg-base-200 py-3 px-4 border border-base-300 rounded-xl shadow-sm text-center text-sm font-medium text-base-content hover:bg-base-300 transition-all flex items-center justify-center gap-2"
                    >
                      <Video size={20} />
                      <span>Choose Media</span>
                      <input
                        id="video-upload"
                        name="video"
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 bg-primary/10 py-3 px-4 border border-primary/20 rounded-xl shadow-sm text-center text-sm font-medium text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Camera size={20} />
                      Record Now
                    </button>
                  </div>

                  <span className="block text-center text-xs text-gray-500">
                    {videoFile ? `Selected: ${videoFile.name}` : "No file selected"}
                  </span>
                </div>
              ) : (
                <div className="relative bg-black rounded-2xl overflow-hidden aspect-[9/16] max-h-[60vh] mx-auto shadow-2xl border border-white/10">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {/* Recording Controls */}
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6">
                    {!isRecording ? (
                      <>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all"
                        >
                          <X size={24} />
                        </button>
                        <button
                          type="button"
                          onClick={startRecording}
                          className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 hover:scale-110 active:scale-95 transition-all"
                        >
                          <div className="w-full h-full rounded-full bg-red-600 shadow-inner"></div>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-4 hover:scale-110 active:scale-95 transition-all"
                      >
                        <Square size={24} className="text-red-600 fill-red-600" />
                      </button>
                    )}
                  </div>

                  {isRecording && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                      <span className="text-xs text-white font-medium">REC</span>
                    </div>
                  )}
                </div>
              )}

              {/* Show the recorded/selected video preview if camera is not active */}
              {!isCameraActive && previewUrl && (
                <div className="mt-4 flex justify-center">
                  <div className="w-full max-w-xs relative group">
                    <video
                      key={previewUrl}
                      src={previewUrl}
                      controls
                      className="w-full aspect-[9/16] object-cover rounded-2xl border-2 border-primary/20 shadow-xl"
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setVideoFile(null);
                          setPreviewUrl(null);
                        }}
                        className="p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save recording prompt */}
              {!isRecording && recordedChunks.length > 0 && isCameraActive && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={saveRecording}
                    className="btn btn-success btn-wide text-white"
                  >
                    Use this Recording
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 sticky bottom-0 bg-base-100 z-10 border-t border-base-300">
              <button
                type="submit"
                disabled={isUploading || isRecording || (!videoFile && !isCameraActive)}
                className={`w-full mb-8 flex btn btn-primary justify-center py-4 
                  px-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white 
                  hover:scale-[1.02] active:scale-[0.98] transition-all
                ${(isUploading || isRecording) ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading Video...
                  </>
                ) : 'Post Video'}
              </button>
            </div>
          </form>
          <ToastContainer position="bottom-right" autoClose={3000} />
        </div>
      </div>
    </div>
  );
};

export default UploadVideo;