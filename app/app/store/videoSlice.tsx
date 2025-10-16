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
    first_name: string;
    last_name: string;
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
    { page = 1, limit = 10 }: { page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await fetch(
        `/api/video/fetch?page=${page}&limit=${limit}`,
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
      console.log("Videos fetch response", res);
      return await res.json();
    } catch (err) { 
      const errorMessage = typeof err === "object" && err !== null && "message" in err
      ? (err as {message?: string }) : "Internal error"
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
        state.videos = action.payload.results;
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
  resetVideoState 
} = videoSlice.actions;

export default videoSlice.reducer;