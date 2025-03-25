"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { uploadVideo } from "@/app/store/videoSlice";
import { AppDispatch } from "@/app/store/store";
import { useRouter } from "next/navigation";

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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Upload a Video</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="title"
          placeholder="Video Title"
          value={formData.title}
          onChange={handleInputChange}
          className="border p-2 w-full rounded"
          required
        />
        <textarea
          name="description"
          placeholder="Video Description (optional)"
          value={formData.description}
          onChange={handleInputChange}
          className="border p-2 w-full rounded"
        />
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="border p-2 w-full"
          required
        />
        {preview && (
          <video src={preview} controls className="w-full h-64 mt-2 rounded-md" />
        )}
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded w-full"
        >
          Upload Video
        </button>
      </form>
    </div>
  );
};

export default UploadVideo;