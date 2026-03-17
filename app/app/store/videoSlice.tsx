import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

// Types
export interface Video {
  id: string;
  title: string;
  description: string;
  file_url: string;
  thumbnail_url: string | null;
  created_at: string;
  views: number;
  duration?: number;
  timestamp: string;
  likes: number;
  dislikes: number;
  user_vote: number;
  uploader: {
    id: string;
    email: string;
    username: string;
    first_name?: string;
    last_name?: string;
  };
}


interface VideoState {
  videos: Video[] | null;
  isLoading: boolean;
  isError: boolean;
  next: string,
  count: string,
  errorMessage: string | null;
};

const initialState: VideoState = {
  videos: null,
  isLoading: false,
  isError: false,
  next: "",
  count: "",
  errorMessage: null,
};

export const fetchVideos = createAsyncThunk(
  "videos/fetchVideos",
  async (
    { page, limit, search, append }: { page: number; limit: number; search: string; append: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/videos/?page=${page}&limit=${limit}&search=${search}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch videos");
      }
      const data = await response.json();
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch videos");
    }
  }
);

const loadInitialState = (): VideoState => {
  if (typeof window === "undefined") return initialState;
  try {
    const saved = localStorage.getItem("video_cache");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...initialState,
        videos: parsed.videos || null,
        next: parsed.next || "",
      };
    }
  } catch (err) {
    console.error("Failed to load video cache:", err);
  }
  return initialState;
};

const saveToCache = (state: VideoState) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("video_cache", JSON.stringify({
      videos: state.videos,
      next: state.next,
    }));
  } catch (err) {
    console.error("Failed to save video cache:", err);
  }
};

const videoSlice = createSlice({
  name: "videos",
  initialState: loadInitialState(),
  reducers: {
    clearUploadStatus: (state) => {
      state.isLoading = false;
      state.isError = false;
      state.errorMessage = null;
    },
    resetVideoState: () => {
      if (typeof window !== "undefined") localStorage.removeItem("video_cache");
      return initialState;
    },
    updateLikes: (state, action: PayloadAction<{ videoId: string; likes: number; liked: boolean; userId?: string }>) => {
      const video = state.videos?.find((v) => v.id === action.payload.videoId);
      if (video) {
        video.likes = action.payload.likes;
        if (action.payload.userId) {
          video.user_vote = action.payload.liked ? 1 : 0;
        }
        saveToCache(state);
      }
    },
    updateViews: (state, action: PayloadAction<{ videoId: string; views: number }>) => {
      const video = state.videos?.find((v) => v.id === action.payload.videoId);
      if (video) {
        video.views = action.payload.views;
        saveToCache(state);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVideos.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = null;
      })
      .addCase(fetchVideos.fulfilled, (state, action) => {
        state.isLoading = false;
        const newVideos = action.payload.results;
        if (action.meta.arg.append && state.videos) {
          state.videos = [...state.videos, ...newVideos];
        } else {
          state.videos = newVideos;
        }
        state.next = action.payload.next;
        saveToCache(state);
      })
      .addCase(fetchVideos.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload as string;
      });
  },
});

export const { clearUploadStatus, resetVideoState, updateLikes, updateViews } = videoSlice.actions;

export default videoSlice.reducer;
