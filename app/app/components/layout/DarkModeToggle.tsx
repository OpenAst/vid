import { AppDispatch, RootState } from "@/app/store/store";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setDarkMode } from '../../store/themeSlice';
export function DarkModeToggle() {
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDarkMode);
    }
  }, [isDarkMode]);

  return (
    <button
      onClick={() => dispatch(setDarkMode(!isDarkMode))}
    >
      {isDarkMode ? '☀️' : '🌙'}
    </button>
  )
}