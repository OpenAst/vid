import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';



export const login = createAsyncThunk(
  'auth/login',
  async (credentials: {
    email: string, password: string, username: string
  }, {rejectWithValue }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data);
      }

      return data;

    } catch (error: unknown) {
      console.log('Error', error)
      
      return rejectWithValue(
        (error instanceof Error ? error.message: 'Not working') || 'Something went wrong'
      );
    }
  }
);


export const register = createAsyncThunk(
  'auth/register',
  async (credentials: {
    email: string, password: string, re_password: string,
    first_name: string, last_name: string, username: string
  }, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify(credentials),
      });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error) || 'Registration failed';
    }  
    return await res.json();
    } catch (error: unknown) {
      console.log('Error', error)
      return rejectWithValue(
        (error instanceof Error ? error.message: 'Something went wrong') || 'Something went wrong'); 
      }
    }
  );
  

  export const activate = createAsyncThunk(
    'auth/activate',
    async ({ uid, token }: { uid: string; token: string }, thunkAPI) => {
      try { 
        const res = await fetch('/api/auth/activate/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid, token }),
        });
  
        if (!res.ok) {
          const errorData = await res.json();
          return thunkAPI.rejectWithValue(errorData);
        }
  
        return {};
      } catch (error) {
        console.log(error);
        return thunkAPI.rejectWithValue({ error: 'Network error' });
      }
    }
  );

  export const refresh = createAsyncThunk(
    'auth/refresh', 
    async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to refresh token');
      }

      const data = await response.json();
      return data.access; // Return the refreshed access token
    } catch (error: unknown) {
      return rejectWithValue(
        (error instanceof Error ? error.message : 'Something went wrong') || 'Unknown error'
      );
    }
  }
);

export const verify = createAsyncThunk(
  'auth/verify',
  async (credentials: { token: string }, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/auth/verify',{
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.error || 'Verification failed');
      }
      return data;
      
    } catch (error) {
      return rejectWithValue(error || 'Verification failed');
    }
  }
)


export const fetchUser = createAsyncThunk(
  'auth/fetchUser',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/auth/user_details', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json'},
      });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error) || 'Failed to fetch user profile';
    }  
    const data = await res.json();
    return data;
    } catch (error: unknown) {
      console.log('Error', error)
      return rejectWithValue(
        (error instanceof Error ? error.message: 'Something went wrong') || 'Something went wrong'); 
      }
    }
  );

export const fetchPublicUser = createAsyncThunk(
  "auth/fetchPublicUser",
  async (username: string, thunkAPI) => {
    try {
      if (!username) throw new Error("Username is required");
      const response = await axios.get(`/api/auth/profile?username=${username}`);
      return response.data;
    } catch (error: unknown) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message: "Error fetching user profile")
    }
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/auth/profile_update/', {
        method: 'PUT',
        body: formData,
        credentials: 'include',
      });
      return await res.json();

    } catch (err) {
      return rejectWithValue(err || 'Failed to update profile');
    }
  }
)


interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string;
  isLoading: boolean;
  registerSuccess: boolean;
  logged_out: boolean;
  isError: boolean;
  errorMessage?: string;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: '',
  isLoading: false,
  registerSuccess: false,
  logged_out: false,
  isError: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticated(state, action) {
      state.isAuthenticated = action.payload.user;
    },
    setUser(state, action) {
      state.user = action.payload.user;
    },
    setUnAuthenticated(state) {
      state.isAuthenticated = false;
      state.user = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = false;
        state.isError = false;
        state.isLoading = true;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
      })
      .addCase(register.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      .addCase(activate.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(activate.fulfilled, (state) => {
        state.isLoading = false;
        state.isError = false;
      })
      .addCase(activate.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      .addCase(refresh.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(refresh.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = action.payload.user;
        state.isError = false;
      })
      .addCase(refresh.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      .addCase(fetchUser.pending, (state) => { 
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.token = action.payload.token;
      })
      .addCase(fetchUser.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      .addCase(fetchPublicUser.pending, (state) => { 
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(fetchPublicUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(fetchPublicUser.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      .addCase(verify.pending, (state) => { 
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(verify.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(verify.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      }) 
      .addCase(updateProfile.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      
  }
});

export const { setAuthenticated, setUser, setUnAuthenticated } = authSlice.actions;
export default authSlice.reducer;
