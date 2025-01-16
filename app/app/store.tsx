import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '@/app/(auth)/apiAuth';


// Configuring the redux store
export const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware()
    .concat(authApi.middleware)
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