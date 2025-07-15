// store.ts

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import videoReducer from './videoSlice';
import themeReducer from './themeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    video: videoReducer,
    theme: themeReducer,
  }
});


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
