import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

// Types
export interface Video {
  id: string;
  title: string;
  description: string;
  skill_category?: string;
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
  isRefreshing: boolean;
  isError: boolean;
  next: string,
  count: string,
  cacheQuery: string;
  errorMessage: string | null;
};

const initialState: VideoState = {
  videos: null,
  isLoading: false,
  isRefreshing: false,
  isError: false,
  next: "",
  count: "",
  cacheQuery: "",
  errorMessage: null,
};

export const fetchVideos = createAsyncThunk(
  "videos/fetchVideos",
  async (
    { page, limit, search, append, background }: { page: number; limit: number; search: string; append: boolean; background?: boolean },
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
        cacheQuery: parsed.query || "",
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
      query: state.cacheQuery,
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
      state.isRefreshing = false;
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
    applyOptimisticLike: (state, action: PayloadAction<{ videoId: string; liked: boolean }>) => {
      const video = state.videos?.find((v) => v.id === action.payload.videoId);
      if (video) {
        const nextLikes = action.payload.liked ? video.likes + 1 : video.likes - 1;
        video.likes = Math.max(0, nextLikes);
        video.user_vote = action.payload.liked ? 1 : 0;
        saveToCache(state);
      }
    },
    applyOptimisticView: (state, action: PayloadAction<{ videoId: string }>) => {
      const video = state.videos?.find((v) => v.id === action.payload.videoId);
      if (video) {
        video.views = Math.max(0, video.views + 1);
        saveToCache(state);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVideos.pending, (state, action) => {
        if (action.meta.arg.background) {
          state.isRefreshing = true;
        } else {
          state.isLoading = true;
        }
        state.isError = false;
        state.errorMessage = null;
      })
      .addCase(fetchVideos.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        const newVideos = action.payload.results;
        if (action.meta.arg.append && state.videos) {
          state.videos = [...state.videos, ...newVideos];
        } else {
          state.videos = newVideos;
        }
        state.next = action.payload.next;
        state.cacheQuery = action.meta.arg.search;
        saveToCache(state);
      })
      .addCase(fetchVideos.rejected, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        if (!action.meta.arg.background) {
          state.isError = true;
          state.errorMessage = action.payload as string;
        }
      });
  },
});

export const {
  clearUploadStatus,
  resetVideoState,
  updateLikes,
  updateViews,
  applyOptimisticLike,
  applyOptimisticView,
} = videoSlice.actions;

export default videoSlice.reducer;
