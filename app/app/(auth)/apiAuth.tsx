import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface AuthResponse {
  access: string;
  refresh: string;
  first_name: string;
  last_name: string;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
      baseUrl: process.env.NEXT_PUBLIC_API_URL,
      credentials: 'include',
      prepareHeaders: (headers) => {
        const accessToken = localStorage.getItem('ACCESS_TOKEN');
    
        if (accessToken  ) {
          headers.set('Authorization', `JWT ${accessToken}`);
          console.log('Access token', accessToken);
        }
        return headers;
      },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, {email: string; password: string }>({
      query: (credentials) => ({
        url: 'auth/jwt/create',
        method: 'POST',
        body: credentials,
      }),
    }),
    
    refresh: builder.mutation({
      query: (refreshToken) => ({
        url: 'auth/jwt/refresh',
        method: 'POST',
        body: { refresh: refreshToken },
      })
    }),

    register: builder.mutation({
      query: (data) => ({
        url: 'auth/users/',
        method: 'POST',
        body: data,
      }),
    }),
    verify: builder.mutation({
      query: (data) => ({
        url: 'auth/activation/',
        method: 'POST',
        body: data,
      }),
    }),
    googleLogin: builder.mutation({
      query: (googleToken) => ({
        url: 'auth/google-login/',
        method: 'POST',
        body: { token: googleToken },
      }),
    }),
    getUserDetails: builder.query({
      query: () => ({
        url: 'auth/users/me/',
        method: 'GET',
      }),
    }),
    passwordReset: builder.mutation({
      query: (email) => ({
        url: 'auth/users/reset_password/',
        method: 'POST',
        body: email,
      }),
    }),
    posts: builder.mutation({
      query: (data) => ({
        url: 'posts/',
        method: 'POST',
        body: data,
      })
    }),
    post: builder.mutation({
      query: ({ slug, ...data} ) => ({
        url: `posts/${slug}/`,
        method: 'POST',
        body: data,
      })
    }),
    
    logout: builder.mutation({
      query: () => ({
        url: 'auth/logout/',
        method: 'POST',
      }),
      async onQueryStarted(args, { queryFulfilled }) {
        try {
          await queryFulfilled;
          localStorage.removeItem('ACCESS_TOKEN');
          console.info('Logout successful!');
        } catch (error) {
          console.error('Logout failed:', error);
        }
      },
    }),
  }),
});


export const {
    useLoginMutation,
    useRegisterMutation,
    useRefreshMutation,
    useVerifyMutation,
    useGoogleLoginMutation,
    useGetUserDetailsQuery,
    usePasswordResetMutation,
    useLogoutMutation,
    usePostMutation,
    usePostsMutation
} = authApi;