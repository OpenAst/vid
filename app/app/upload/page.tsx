"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, Music2, Video, X, Square } from "lucide-react";
import { useUploadManager } from "@/app/components/upload/UploadProvider";
import { useDispatch, useSelector } from "react-redux";
import { fetchUser } from "@/app/store/authSlice";
import { AppDispatch } from "@/app/store/store";
import { useRouter } from "next/navigation";
import { RootState } from "@/app/store/store";
import { toast, ToastContainer } from 'react-toastify';


interface FormDataState {
  title: string;
  description: string;
  skill_category: string;
  thumbnail?: File;
}

const UPLOAD_DRAFT_STORAGE_KEY = "oneclyq_upload_draft";

const uploadCategories = [
  { value: "general", label: "General" },
  { value: "comedy", label: "Comedy" },
  { value: "music", label: "Music" },
  { value: "dance", label: "Dance" },
  { value: "fashion", label: "Fashion" },
  { value: "gaming", label: "Gaming" },
  { value: "food", label: "Food" },
  { value: "fitness", label: "Fitness" },
  { value: "beauty", label: "Beauty" },
  { value: "tech", label: "Tech" },
  { value: "film", label: "Film" },
  { value: "sports", label: "Sports" },
  { value: "travel", label: "Travel" },
];

const emptyFormData: FormDataState = {
  title: "",
  description: "",
  skill_category: "general",
};

const UploadVideo = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { hasActiveUploads, startUpload } = useUploadManager();


  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [musicPreviewUrl, setMusicPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormDataState>(emptyFormData);
  const [didRestoreDraft, setDidRestoreDraft] = useState(false);
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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

  const handleMusicFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      setMusicFile(file);
      setMusicPreviewUrl(URL.createObjectURL(file));
    } else {
      toast.error("Selected file is not a valid audio file");
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (musicPreviewUrl) {
        URL.revokeObjectURL(musicPreviewUrl);
      }
    }
  }, [previewUrl, musicPreviewUrl]);

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(UPLOAD_DRAFT_STORAGE_KEY);
      if (!rawDraft) {
        setDidRestoreDraft(true);
        return;
      }

      const savedDraft = JSON.parse(rawDraft) as Partial<FormDataState>;
      const restoredDraft = {
        ...emptyFormData,
        title: savedDraft.title || "",
        description: savedDraft.description || "",
        skill_category: savedDraft.skill_category || "general",
      };

      setFormData(restoredDraft);
      setDidRestoreDraft(true);

      if (
        restoredDraft.title.trim() ||
        restoredDraft.description.trim() ||
        restoredDraft.skill_category !== "general"
      ) {
        toast.info("Upload draft restored.");
      }
    } catch (error) {
      console.warn("Could not restore upload draft", error);
      window.localStorage.removeItem(UPLOAD_DRAFT_STORAGE_KEY);
      setDidRestoreDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!didRestoreDraft) return;

    const hasDraftContent =
      formData.title.trim() ||
      formData.description.trim() ||
      formData.skill_category !== "general";

    try {
      if (!hasDraftContent) {
        window.localStorage.removeItem(UPLOAD_DRAFT_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(
        UPLOAD_DRAFT_STORAGE_KEY,
        JSON.stringify({
          title: formData.title,
          description: formData.description,
          skill_category: formData.skill_category,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.warn("Could not save upload draft", error);
    }
  }, [didRestoreDraft, formData]);

  const hasSelectedMedia = Boolean(videoFile || musicFile || recordedChunks.length > 0);

  useEffect(() => {
    if (!hasSelectedMedia || hasActiveUploads) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasActiveUploads, hasSelectedMedia]);

  const clearDraft = () => {
    window.localStorage.removeItem(UPLOAD_DRAFT_STORAGE_KEY);
    setFormData(emptyFormData);
    setVideoFile(null);
    setMusicFile(null);
    setPreviewUrl(null);
    setMusicPreviewUrl(null);
    setRecordedChunks([]);
    toast.info("Upload draft cleared.");
  };

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

    startUpload({
      videoFile,
      musicFile,
      title: formData.title,
      description: formData.description,
      skillCategory: formData.skill_category,
    });
    window.localStorage.removeItem(UPLOAD_DRAFT_STORAGE_KEY);
    setFormData(emptyFormData);
    setVideoFile(null);
    setMusicFile(null);
    setPreviewUrl(null);
    setMusicPreviewUrl(null);
    setRecordedChunks([]);
    toast.success("Upload started. You can keep using the app.");
    router.push("/");
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
      <div className="flex h-screen items-center justify-center bg-base-100">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const hasDraftContent =
    formData.title.trim() ||
    formData.description.trim() ||
    formData.skill_category !== "general";

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-10 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Creator studio</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Upload clip</h1>
            <p className="mt-2 text-sm font-medium text-base-content/70">
              Post a video, add context, and keep moving while upload runs.
            </p>
          </div>
            {(hasDraftContent || hasSelectedMedia) && (
              <button
                type="button"
                onClick={clearDraft}
                className="rounded-full border border-base-300 bg-base-100 px-4 py-2 text-sm font-semibold text-base-content shadow-sm transition hover:bg-base-200"
              >
                Clear draft
              </button>
            )}
        </div>

        <section className="overflow-hidden rounded-2xl border border-[rgba(68,13,156,0.18)] bg-base-100 shadow-sm">
          <form onSubmit={handleSubmit} className="relative space-y-6 p-4 sm:p-6">
            {hasDraftContent && (
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-base-content">
                Draft autosaved on this device. Selected media is kept only until you post or leave the page.
              </div>
            )}

            {hasSelectedMedia && !hasActiveUploads && (
              <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-medium text-base-content">
                You have media selected but not posted yet. Refreshing or closing this page can lose that selection.
              </div>
            )}

            {/* Title Input */}
            <div>
              <label htmlFor="title" className="mb-2 block text-sm font-bold text-base-content">
                Video Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-[rgba(68,13,156,0.22)] bg-base-100 px-4 py-3 text-base-content shadow-sm transition-all focus:border-[rgb(68,13,156)] focus:outline-none focus:ring-2 focus:ring-[rgba(68,13,156,0.18)]"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="description" className="mb-2 block text-sm font-bold text-base-content">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-[rgba(68,13,156,0.22)] bg-base-100 px-4 py-3 text-base-content shadow-sm transition-all focus:border-[rgb(68,13,156)] focus:outline-none focus:ring-2 focus:ring-[rgba(68,13,156,0.18)]"
                maxLength={500}
              />
            </div>

            <div>
              <label htmlFor="skill_category" className="mb-2 block text-sm font-bold text-base-content">
                Category
              </label>
              <select
                id="skill_category"
                name="skill_category"
                value={formData.skill_category}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-[rgba(68,13,156,0.22)] bg-base-100 px-4 py-3 text-base-content shadow-sm transition-all focus:border-[rgb(68,13,156)] focus:outline-none focus:ring-2 focus:ring-[rgba(68,13,156,0.18)]"
              >
                {uploadCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-base-content">
                Video Content *
              </label>

              {!isCameraActive ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label
                      htmlFor="video-upload"
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[rgba(68,13,156,0.18)] bg-base-200 px-4 py-3 text-center text-sm font-medium text-base-content shadow-sm transition-all hover:bg-base-300"
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

                  <span className="block text-center text-xs font-medium text-base-content/70">
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

            <div>
              <label htmlFor="music-upload" className="mb-2 block text-sm font-bold text-base-content">
                Background Music
              </label>
              <label
                htmlFor="music-upload"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[rgba(68,13,156,0.18)] bg-base-200 px-4 py-3 text-center text-sm font-medium text-base-content shadow-sm transition-all hover:bg-base-300"
              >
                <Music2 size={20} />
                <span>{musicFile ? "Change Music" : "Choose Music"}</span>
                <input
                  id="music-upload"
                  name="music"
                  type="file"
                  accept="audio/*"
                  onChange={handleMusicFileChange}
                  className="sr-only"
                />
              </label>
              {musicFile && (
                <div className="mt-3 rounded-xl border border-[rgba(68,13,156,0.18)] bg-base-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm text-base-content/80">{musicFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMusicFile(null);
                        setMusicPreviewUrl(null);
                      }}
                      className="p-1.5 rounded-full bg-base-300 text-base-content hover:bg-red-500 hover:text-white transition-colors"
                      aria-label="Remove background music"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {musicPreviewUrl && (
                    <audio src={musicPreviewUrl} controls className="mt-3 w-full" />
                  )}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 z-10 -mx-4 border-t border-base-300 bg-base-100/95 px-4 pb-2 pt-4 backdrop-blur sm:-mx-6 sm:px-6">
              <button
                type="submit"
                disabled={hasActiveUploads || isRecording || (!videoFile && !isCameraActive)}
                className={`flex w-full items-center justify-center rounded-xl border border-transparent bg-[rgb(68,13,156)] px-4 py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.01] hover:bg-[rgb(57,10,132)] active:scale-[0.99]
                ${(hasActiveUploads || isRecording || (!videoFile && !isCameraActive)) ? 'cursor-not-allowed bg-[rgb(68,13,156)]/60 text-white/95 hover:scale-100 hover:bg-[rgb(68,13,156)]/60' : ''}`}
              >
                {hasActiveUploads ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Upload running...
                  </>
                ) : 'Post clip'}
              </button>
            </div>
          </form>
          <ToastContainer position="bottom-right" autoClose={3000} />
        </section>
      </div>
    </main>
  );
};

export default UploadVideo;
