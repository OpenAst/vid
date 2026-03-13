import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

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
    { page = 1, limit = 10, search = "", append = false }: { page?: number; limit?: number; search?: string, append?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const url = `/api/video/fetch?page=${page}&limit=${limit}${searchParam}`;
      console.log("DEBUG: fetchVideos URL:", url, "append:", append);

      const res = await fetch(
        url,
        {
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        return rejectWithValue(
          errorData.error?.message ||
          errorData.message ||
          "Failed to fetch videos"
        );
      }
      return await res.json();
    } catch (err) {
      const errorMessage = typeof err === "object" && err !== null && "message" in err
        ? (err as { message?: string }) : "Internal error"
      return rejectWithValue(
        errorMessage || "Network error while fetching videos"
      );
    }
  }
);


const videoSlice = createSlice({
  name: "videos",
  initialState,
  reducers: {
    clearUploadStatus: (state) => {
      state.isLoading = false;
      state.isError = false;
      state.errorMessage = null;
    },
    resetVideoState: () => initialState,
    videoLiked: (state, action) => {
      const { videoId, likes, actorUserId, currentUserId } = action.payload;
      if (state.videos) {
        const video = state.videos.find(v => v.id === videoId);
        if (video) {
          video.likes = typeof likes === "number" ? likes : video.likes + 1;
          if (actorUserId && currentUserId && actorUserId === currentUserId) {
            video.user_vote = 1;
          }
        }
      }
    },
    videoUnliked: (state, action) => {
      const { videoId, likes, actorUserId, currentUserId } = action.payload;
      if (state.videos) {
        const video = state.videos.find(v => v.id === videoId);
        if (video && video.likes > 0) {
          video.likes = typeof likes === "number" ? likes : video.likes - 1;
          if (actorUserId && currentUserId && actorUserId === currentUserId) {
            video.user_vote = 0;
          }
        }
      }
    }
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
      })
      .addCase(fetchVideos.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload as string;
      });
  },
});

export const {
  clearUploadStatus,
  resetVideoState,
  videoLiked,
  videoUnliked
} = videoSlice.actions;

export default videoSlice.reducer;
