import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Create the API slice
export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL, // Ensure this is set in your environment variables
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('ACCESS_TOKEN');
      if (token) {
        headers.set('Authorization', `JWT ${token}`);
        console.log('Token from localStorage:', localStorage.getItem('ACCESS_TOKEN'));
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: 'auth/jwt/create',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(args, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          localStorage.setItem('ACCESS_TOKEN', data.access); // Save access token dynamically
          console.info('Login successful!');
        } catch (error) {
          console.error('Login failed:', error);
        }
      },
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
  useVerifyMutation,
  useGoogleLoginMutation,
  useGetUserDetailsQuery,
  usePasswordResetMutation,
  useLogoutMutation,
} = authApi;
