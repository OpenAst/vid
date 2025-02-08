import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';


export const login = createAsyncThunk(
  'auth/login',
  async (credentials: {
    email: string, password: string
  }, {rejectWithValue }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        throw new Error('Login failed');
      }

      return await res.json();
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
    first_name: string, last_name: string,
  }, { rejectWithValue }) => {
    try {
      const res = await fetch('api/auth/register', {
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
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('api/auth/verify',{
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
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
      const res = await fetch('api/auth/user_details', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json'},
      });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error) || 'Failed to fetch user profile';
    }  
    return await res.json();
    } catch (error: unknown) {
      console.log('Error', error)
      return rejectWithValue(
        (error instanceof Error ? error.message: 'Something went wrong') || 'Something went wrong'); 
      }
    }
  );

  

interface AuthState {
  isAuthenticated: boolean;
  user: string | null;
  isLoading: boolean;
  registerSuccess: boolean;
  logged_out: boolean;
  isError: boolean;
  errorMessage?: string;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
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
      state.isAuthenticated = action.payload;
    },
    setUser(state, action) {
      state.user = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
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
      .addCase(register.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      .addCase(refresh.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(refresh.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = action.payload;
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
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchUser.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      .addCase(verify.pending, (state) => { 
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(verify.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(verify.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
  }
});

export const { setAuthenticated, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
