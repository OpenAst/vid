import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

// Types
export interface Video {
  id: string;
  title: string;
  description: string;
  file_url: string;
  hls_url?: string | null;
  media_type?: "video" | "image";
  music_url?: string | null;
  processing_status?: string;
  thumbnail_url: string | null;
  created_at: string;
  views: number;
  duration?: number;
  timestamp: string;
  likes: number;
  dislikes: number;
  comments_count?: number;
  user_vote: number;
  is_saved?: boolean;
  watch_progress?: {
    progress_seconds: number;
    duration_seconds: number;
    completed: boolean;
    updated_at: string;
  } | null;
  skill_category?: string;
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
  activeRequestId: string | null;
  errorMessage: string | null;
};

const getStableShuffleScore = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const shuffleVideos = (videos: Video[], seed?: string) => {
  if (!seed || videos.length < 2) return videos;

  return [...videos].sort((first, second) => (
    getStableShuffleScore(`${seed}:${first.id}`) - getStableShuffleScore(`${seed}:${second.id}`)
  ));
};

const getCacheQuery = (arg: { search: string; feed?: string; category?: string; cacheScope?: string }) => [
  arg.search,
  arg.feed || "for-you",
  arg.category || "",
  arg.cacheScope || "",
].join("|");

const initialState: VideoState = {
  videos: null,
  isLoading: false,
  isRefreshing: false,
  isError: false,
  next: "",
  count: "",
  cacheQuery: "",
  activeRequestId: null,
  errorMessage: null,
};

export const fetchVideos = createAsyncThunk(
  "videos/fetchVideos",
  async (
    { page, limit, search, append, background, feed, category }: { page: number; limit: number; search: string; append: boolean; background?: boolean; feed?: string; category?: string; shuffleSeed?: string; cacheScope?: string },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
      });
      if (feed) params.set("feed", feed);
      if (category) params.set("category", category);

      const response = await fetch(`/api/video/fetch?${params.toString()}`);
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
    updateSaveState: (state, action: PayloadAction<{ videoId: string; isSaved: boolean }>) => {
      const video = state.videos?.find((v) => v.id === action.payload.videoId);
      if (video) {
        video.is_saved = action.payload.isSaved;
        saveToCache(state);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVideos.pending, (state, action) => {
        const requestCacheQuery = getCacheQuery(action.meta.arg);
        if (!action.meta.arg.append) {
          state.activeRequestId = action.meta.requestId;
        }
        if (action.meta.arg.background || action.meta.arg.append) {
          state.isRefreshing = true;
        } else {
          state.isLoading = true;
          if (state.cacheQuery !== requestCacheQuery) {
            state.videos = null;
            state.next = "";
            state.cacheQuery = requestCacheQuery;
          }
        }
        state.isError = false;
        state.errorMessage = null;
      })
      .addCase(fetchVideos.fulfilled, (state, action) => {
        const requestCacheQuery = getCacheQuery(action.meta.arg);
        if (action.meta.arg.append) {
          if (state.cacheQuery !== requestCacheQuery) return;
        } else if (state.activeRequestId !== action.meta.requestId) {
          return;
        }

        state.isLoading = false;
        state.isRefreshing = false;
        if (!action.meta.arg.append) {
          state.activeRequestId = null;
        }
        const newVideos = shuffleVideos(action.payload.results || [], action.meta.arg.shuffleSeed);
        if (action.meta.arg.append && state.videos) {
          state.videos = [...state.videos, ...newVideos];
        } else {
          state.videos = newVideos;
        }
        state.next = action.payload.next;
        state.cacheQuery = requestCacheQuery;
        saveToCache(state);
      })
      .addCase(fetchVideos.rejected, (state, action) => {
        if (action.meta.arg.append) {
          state.isRefreshing = false;
          return;
        }
        if (state.activeRequestId !== action.meta.requestId) return;

        state.isLoading = false;
        state.isRefreshing = false;
        state.activeRequestId = null;
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
  updateSaveState,
} = videoSlice.actions;

export default videoSlice.reducer;
