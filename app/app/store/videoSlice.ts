import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const uploadVideo = createAsyncThunk(
  "video/uploadVideo",
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/video/upload/", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => "Failed to upload video");
        return rejectWithValue(errorData);
      }

      return await res.json();
    } catch (err) {
      return rejectWithValue(err || "Failed to upload video");
    }
  }
);

export const fetchVideos = createAsyncThunk(
  "videos/fetch",
  async ({ page = 1, limit = 10 }: { page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/videos/?page=${page}&limit=${limit}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => "Failed to fetch videos");
        return rejectWithValue(errorData.message || "Failed to fetch videos")
      }
      return await res.json();
    } catch (err) {
      return rejectWithValue(err || "Failed to fetch videos");
    }
  }
);

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
}

interface VideoState {
  videos: {
    count: number;
    next: string | null;
    previous: string | null;
    results: Video[];
  } | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}

const initialState: VideoState = {
  videos: null,
  isLoading: false,
  isError: false,
  errorMessage: "",
};

const videoSlice = createSlice({
  name: "videos",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(uploadVideo.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(uploadVideo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        
        if (state.videos) {
          state.videos.results.push(action.payload);
        } else {
          state.videos = {
            count: 1,
            next: null,
            previous: null,
            results: [action.payload],
          };
        }; 
      })
      .addCase(uploadVideo.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload as string;
      })
      .addCase(fetchVideos.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchVideos.fulfilled, (state, action) => {
        state.isLoading = false;
        state.videos = action.payload;
      })
      .addCase(fetchVideos.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload as string;
      });
  },
});

export default videoSlice.reducer;
