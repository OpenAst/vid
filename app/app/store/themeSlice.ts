import { createSlice } from "@reduxjs/toolkit";


interface ThemeState {
  isDarkMode: boolean;
}

const initialState: ThemeState = {
  isDarkMode: false,
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setDarkMode: (state, action) => {
      state.isDarkMode = action.payload;
    },
  },
});

export const { setDarkMode } = themeSlice.actions;
export default themeSlice.reducer;